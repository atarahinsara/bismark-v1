import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { scanFile, isAllowedFileType, isAllowedFileSize } from '@/lib/clamav'
import { logger } from '@/lib/logger'

/**
 * GET /api/v1/files
 * List file attachments with pagination.
 * Requires: system.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'system.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.fileAttachment.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.fileAttachment.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list files', statusCode: 500 })
  }
}

/**
 * POST /api/v1/files
 * Upload a new file attachment.
 *
 * T-2-19: Virus scan (ClamAV) on upload
 * T-2-20: Signed URL generation for download
 *
 * Accepts multipart/form-data with:
 *   - file: File (binary)
 *   - entityType: string (required)
 *   - entityId: string (required)
 *   - isPublic: boolean (optional, default false)
 *
 * Requires: system.manage
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'system.manage')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entityType') as string | null
    const entityId = formData.get('entityId') as string | null
    const isPublic = formData.get('isPublic') === 'true'

    // Validation
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!file) errors.push({ field: 'file', message: 'File is required', code: 'REQUIRED' })
    if (!entityType) errors.push({ field: 'entityType', message: 'Entity type is required', code: 'REQUIRED' })
    if (!entityId) errors.push({ field: 'entityId', message: 'Entity ID is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Type + size validation (T-2-19)
    if (!isAllowedFileType(file!.type, file!.name)) {
      throw new ValidationException('File type not allowed', [
        { field: 'file', message: `Type ${file!.type} not allowed`, code: 'INVALID_TYPE' },
      ])
    }
    if (!isAllowedFileSize(file!.size)) {
      throw new ValidationException('File too large', [
        { field: 'file', message: 'Max size 10MB', code: 'TOO_LARGE' },
      ])
    }

    // Read file buffer
    const fileBuffer = Buffer.from(await file!.arrayBuffer())

    // T-2-19: Virus scan
    const scanResult = await scanFile(fileBuffer, file!.name)
    if (scanResult.status === 'infected') {
      logger.warn({ fileName: file!.name, threat: scanResult.threat, userId: ctx.userId }, 'Virus detected — upload rejected')
      return errorResponse({
        code: 'VIRUS_DETECTED',
        message: `File is infected with: ${scanResult.threat}`,
        statusCode: 422,
      })
    }

    // Generate file path (sandbox: local filesystem; production: MinIO/S3)
    const fileId = crypto.randomUUID()
    const fileExtension = file!.name.split('.').pop() || 'bin'
    const filePath = `uploads/${tenantId}/${entityType}/${entityId}/${fileId}.${fileExtension}`

    // Save file to local filesystem (sandbox)
    const fs = await import('fs/promises')
    const path = await import('path')
    const uploadDir = path.join(process.cwd(), 'upload', tenantId, entityType, entityId)
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, `${fileId}.${fileExtension}`), fileBuffer)

    // Create FileAttachment record
    const item = await db.fileAttachment.create({
      data: {
        tenantId,
        fileName: file!.name,
        filePath,
        fileSize: file!.size,
        mimeType: file!.type,
        storageType: 'local',
        entityType: entityType!,
        entityId: entityId!,
        uploadedBy: ctx.userId,
        uploadedAt: new Date(),
        isPublic,
        metadata: {
          originalName: file!.name,
          scanStatus: scanResult.status,
          scanThreat: scanResult.threat || null,
          scannedAt: scanResult.scannedAt.toISOString(),
        },
        virusScanStatus: scanResult.status === 'clean' ? 'clean' : scanResult.status === 'skipped' ? 'pending' : scanResult.status,
      },
    })

    logger.info({ fileId: item.id, fileName: file!.name, userId: ctx.userId }, 'File uploaded')

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, '{}')
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'File upload failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to upload file', statusCode: 500 })
  }
}
