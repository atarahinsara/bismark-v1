/**
 * GET /api/v1/files/[id]/url
 *
 * Returns a signed, time-limited URL for downloading a file.
 *
 * T-2-20: Signed URL with expiry (15 min default).
 *
 * Security:
 *   - User must be authenticated
 *   - User must have system.read permission OR be the file uploader
 *   - URL expires after 15 minutes (configurable via ?expires_in=seconds)
 *   - URL is signed with HMAC-SHA256 to prevent tampering
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, NotFoundException } from '@/lib/shared'
import { logger } from '@/lib/logger'

const DEFAULT_EXPIRY_SECONDS = 15 * 60 // 15 minutes
const MAX_EXPIRY_SECONDS = 60 * 60 // 1 hour

function getSigningKey(): string {
  return process.env.JWT_SECRET || process.env.FILE_URL_SECRET || 'bismark-dev-file-url-secret'
}

/**
 * Generate a signed URL token.
 * Format: base64(payload).hmac_signature
 */
async function generateSignedUrl(
  fileId: string,
  tenantId: string,
  expiresAt: number, // epoch ms
): Promise<string> {
  const payload = JSON.stringify({ fileId, tenantId, exp: expiresAt })
  const payloadB64 = Buffer.from(payload).toString('base64url')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSigningKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
  const sigB64 = Buffer.from(signature).toString('base64url')

  return `${payloadB64}.${sigB64}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const { id: fileId } = await params
    const tenantId = await getTenantId()

    // Find file
    const file = await db.fileAttachment.findFirst({
      where: { id: fileId, tenantId },
    })

    if (!file) {
      throw new NotFoundException('FileAttachment', fileId)
    }

    // Authorization: must have system.read OR be the uploader
    try {
      await requirePermission(ctx, 'system.read')
    } catch {
      if (file.uploadedBy !== ctx.userId) {
        return errorResponse({
          code: 'FORBIDDEN',
          message: 'You do not have access to this file',
          statusCode: 403,
        })
      }
    }

    // Parse expiry
    const url = new URL(request.url)
    const expiresInSeconds = Math.min(
      parseInt(url.searchParams.get('expires_in') || String(DEFAULT_EXPIRY_SECONDS), 10),
      MAX_EXPIRY_SECONDS,
    )
    const expiresAt = Date.now() + expiresInSeconds * 1000

    // Generate signed URL token
    const token = await generateSignedUrl(file.id, tenantId, expiresAt)

    // Build download URL
    const downloadUrl = `/api/v1/files/${file.id}/download?token=${token}`

    logger.info({ fileId: file.id, userId: ctx.userId, expiresAt }, 'Signed URL generated')

    return jsonResponse({
      data: {
        url: downloadUrl,
        expiresAt: new Date(expiresAt).toISOString(),
        expiresIn: expiresInSeconds,
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    logger.error({ err: e }, 'Signed URL generation failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate URL', statusCode: 500 })
  }
}
