import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/technician-performance
 * List technician performance records with pagination.
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
      db.technicianPerformance.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.technicianPerformance.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list technician performance', statusCode: 500 })
  }
}

/**
 * POST /api/v1/technician-performance
 * Create a new technician performance record (e.g., monthly summary).
 * Required body: technicianId, period
 * Optional: completedJobs, avgCompletionTimeHours, firstTimeFixRate, customerRating,
 *           slaComplianceRate, totalRevenue
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + uniqueness check (technician + period).
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
    if (!body.technicianId) errors.push({ field: 'technicianId', message: 'Technician is required', code: 'REQUIRED' })
    if (!body.period) errors.push({ field: 'period', message: 'Period is required (e.g., 1403-05)', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate period format (YYYY-MM, Persian year supported)
    if (!/^\d{4}-\d{2}$/.test(body.period)) {
      throw new ValidationException('Invalid period format', [
        { field: 'period', message: 'Must be in YYYY-MM format (e.g., 1403-05)', code: 'INVALID_FORMAT' },
      ])
    }

    // Verify technician (Party) exists — loose FK (LAW-01)
    const technician = await db.party.findFirst({
      where: { id: body.technicianId, tenantId, deletedAt: null },
    })
    if (!technician) throw new NotFoundException('Party', body.technicianId)

    // Check uniqueness — @@unique([tenantId, technicianId, period])
    const existing = await db.technicianPerformance.findFirst({
      where: { tenantId, technicianId: body.technicianId, period: body.period },
    })
    if (existing) {
      throw new ConflictException(`Performance already exists for technician ${body.technicianId} in period ${body.period}`)
    }

    const item = await db.technicianPerformance.create({
      data: {
        tenantId,
        technicianId: body.technicianId,
        period: body.period,
        completedJobs: body.completedJobs ?? 0,
        avgCompletionTimeHours: body.avgCompletionTimeHours ?? 0,
        firstTimeFixRate: body.firstTimeFixRate ?? 0,
        customerRating: body.customerRating ?? 0,
        slaComplianceRate: body.slaComplianceRate ?? 0,
        totalRevenue: body.totalRevenue ?? 0,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create technician performance', statusCode: 500 })
  }
}
