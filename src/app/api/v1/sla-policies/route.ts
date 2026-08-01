import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/sla-policies
 * List SLA policies with pagination.
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
      db.sLAPolicy.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.sLAPolicy.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list SLA policies', statusCode: 500 })
  }
}

/**
 * POST /api/v1/sla-policies
 * Create a new SLA policy.
 * Required body: name, responseTimeMinutes, resolutionTimeHours
 * Optional: priority, entityType, isActive
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + validation + numeric range check.
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
    if (!body.name) errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' })
    if (body.responseTimeMinutes === undefined || body.responseTimeMinutes === null) {
      errors.push({ field: 'responseTimeMinutes', message: 'Response time (minutes) is required', code: 'REQUIRED' })
    }
    if (body.resolutionTimeHours === undefined || body.resolutionTimeHours === null) {
      errors.push({ field: 'resolutionTimeHours', message: 'Resolution time (hours) is required', code: 'REQUIRED' })
    }
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate numeric ranges
    const responseTimeMinutes = Number(body.responseTimeMinutes)
    const resolutionTimeHours = Number(body.resolutionTimeHours)
    if (Number.isNaN(responseTimeMinutes) || responseTimeMinutes < 0) {
      throw new ValidationException('Invalid response time', [
        { field: 'responseTimeMinutes', message: 'Must be a non-negative number', code: 'OUT_OF_RANGE' },
      ])
    }
    if (Number.isNaN(resolutionTimeHours) || resolutionTimeHours < 0) {
      throw new ValidationException('Invalid resolution time', [
        { field: 'resolutionTimeHours', message: 'Must be a non-negative number', code: 'OUT_OF_RANGE' },
      ])
    }

    // Validate enums
    if (body.priority) {
      const validPriorities = ['low', 'medium', 'high', 'critical']
      if (!validPriorities.includes(body.priority)) {
        throw new ValidationException('Invalid priority', [
          { field: 'priority', message: `Must be one of: ${validPriorities.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }
    if (body.entityType) {
      const validTypes = ['service_request', 'complaint']
      if (!validTypes.includes(body.entityType)) {
        throw new ValidationException('Invalid entity type', [
          { field: 'entityType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }

    const item = await db.sLAPolicy.create({
      data: {
        tenantId,
        name: body.name,
        priority: body.priority ?? 'medium',
        responseTimeMinutes,
        resolutionTimeHours,
        entityType: body.entityType ?? 'service_request',
        isActive: body.isActive ?? true,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create SLA policy', statusCode: 500 })
  }
}
