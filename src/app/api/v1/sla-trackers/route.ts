import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/sla-trackers
 * List SLA trackers with pagination.
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
      db.sLATracker.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.sLATracker.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list SLA trackers', statusCode: 500 })
  }
}

/**
 * POST /api/v1/sla-trackers
 * Create a new SLA tracker for an entity (service_request or complaint).
 * Required body: entityType, entityId, slaPolicyId, responseDeadline, resolutionDeadline
 * Optional: respondedAt, resolvedAt, isBreached, breachReason
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + validation + FK check + uniqueness check.
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
    if (!body.entityType) errors.push({ field: 'entityType', message: 'Entity type is required', code: 'REQUIRED' })
    if (!body.entityId) errors.push({ field: 'entityId', message: 'Entity ID is required', code: 'REQUIRED' })
    if (!body.slaPolicyId) errors.push({ field: 'slaPolicyId', message: 'SLA policy is required', code: 'REQUIRED' })
    if (!body.responseDeadline) errors.push({ field: 'responseDeadline', message: 'Response deadline is required', code: 'REQUIRED' })
    if (!body.resolutionDeadline) errors.push({ field: 'resolutionDeadline', message: 'Resolution deadline is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate entityType enum
    const validTypes = ['service_request', 'complaint']
    if (!validTypes.includes(body.entityType)) {
      throw new ValidationException('Invalid entity type', [
        { field: 'entityType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    // Verify SLA policy exists — FK constraint (Prisma relation)
    const policy = await db.sLAPolicy.findFirst({
      where: { id: body.slaPolicyId, tenantId },
    })
    if (!policy) throw new NotFoundException('SLAPolicy', body.slaPolicyId)

    // Check uniqueness — @@unique([tenantId, entityType, entityId])
    const existing = await db.sLATracker.findFirst({
      where: { tenantId, entityType: body.entityType, entityId: body.entityId },
    })
    if (existing) {
      throw new ConflictException(`SLA tracker already exists for ${body.entityType} ${body.entityId}`)
    }

    const item = await db.sLATracker.create({
      data: {
        tenantId,
        entityType: body.entityType,
        entityId: body.entityId,
        slaPolicyId: body.slaPolicyId,
        responseDeadline: new Date(body.responseDeadline),
        resolutionDeadline: new Date(body.resolutionDeadline),
        respondedAt: body.respondedAt ? new Date(body.respondedAt) : null,
        resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null,
        isBreached: body.isBreached ?? false,
        breachReason: body.breachReason ?? null,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create SLA tracker', statusCode: 500 })
  }
}
