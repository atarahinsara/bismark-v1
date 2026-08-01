import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/complaints
 * List complaints with pagination.
 * Requires: service.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.complaint.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.complaint.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list complaints', statusCode: 500 })
  }
}

/**
 * POST /api/v1/complaints
 * Create a new complaint (ticket).
 * Required body: customerId, complaintType, subject, description
 * Optional: severity, relatedEntityType, relatedEntityId, slaDeadline, metadata
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + BusinessCodeGenerator + validation.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation — required fields per Prisma schema
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.customerId) errors.push({ field: 'customerId', message: 'Customer is required', code: 'REQUIRED' })
    if (!body.complaintType) errors.push({ field: 'complaintType', message: 'Complaint type is required', code: 'REQUIRED' })
    if (!body.subject) errors.push({ field: 'subject', message: 'Subject is required', code: 'REQUIRED' })
    if (!body.description) errors.push({ field: 'description', message: 'Description is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate complaintType enum
    const validTypes = ['service', 'product', 'billing', 'delivery', 'warranty', 'other']
    if (!validTypes.includes(body.complaintType)) {
      throw new ValidationException('Invalid complaint type', [
        { field: 'complaintType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    // Verify customer (Party) exists — loose FK (LAW-01)
    const customer = await db.party.findFirst({
      where: { id: body.customerId, tenantId, deletedAt: null },
    })
    if (!customer) throw new NotFoundException('Party', body.customerId)

    // Generate business code (LAW-02)
    const complaintNumber = await BusinessCodeGenerator.generate('complaint', tenantId)

    const item = await db.complaint.create({
      data: {
        tenantId,
        complaintNumber,
        customerId: body.customerId,
        complaintType: body.complaintType,
        severity: body.severity ?? 'medium',
        status: 'open',
        relatedEntityType: body.relatedEntityType ?? null,
        relatedEntityId: body.relatedEntityId ?? null,
        subject: body.subject,
        description: body.description,
        resolution: null,
        slaDeadline: body.slaDeadline ? new Date(body.slaDeadline) : null,
        metadata: body.metadata ?? {},
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create complaint', statusCode: 500 })
  }
}
