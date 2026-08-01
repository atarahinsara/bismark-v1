import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/technician-availability
 * List technician availability with pagination.
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
      db.technicianAvailability.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.technicianAvailability.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list technician availability', statusCode: 500 })
  }
}

/**
 * POST /api/v1/technician-availability
 * Create a new technician availability record.
 * Required body: technicianId, date, startTime, endTime
 * Optional: status, city, coverageArea
 * Requires: service.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + uniqueness check (technician + date).
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
    if (!body.date) errors.push({ field: 'date', message: 'Date is required', code: 'REQUIRED' })
    if (!body.startTime) errors.push({ field: 'startTime', message: 'Start time is required', code: 'REQUIRED' })
    if (!body.endTime) errors.push({ field: 'endTime', message: 'End time is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate status enum
    if (body.status) {
      const validStatuses = ['available', 'busy', 'off', 'vacation']
      if (!validStatuses.includes(body.status)) {
        throw new ValidationException('Invalid status', [
          { field: 'status', message: `Must be one of: ${validStatuses.join(', ')}`, code: 'INVALID_ENUM' },
        ])
      }
    }

    // Verify technician (Party) exists — loose FK (LAW-01)
    const technician = await db.party.findFirst({
      where: { id: body.technicianId, tenantId, deletedAt: null },
    })
    if (!technician) throw new NotFoundException('Party', body.technicianId)

    // Check uniqueness — @@unique([tenantId, technicianId, date])
    // NOTE: SQLite stores DateTime with time component; we normalize to start-of-day.
    const dateObj = new Date(body.date)
    dateObj.setHours(0, 0, 0, 0)
    const existing = await db.technicianAvailability.findFirst({
      where: { tenantId, technicianId: body.technicianId, date: dateObj },
    })
    if (existing) {
      throw new ConflictException(`Availability already exists for technician ${body.technicianId} on ${dateObj.toISOString().split('T')[0]}`)
    }

    const item = await db.technicianAvailability.create({
      data: {
        tenantId,
        technicianId: body.technicianId,
        date: dateObj,
        startTime: body.startTime,
        endTime: body.endTime,
        status: body.status ?? 'available',
        city: body.city ?? null,
        coverageArea: body.coverageArea ?? null,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create technician availability', statusCode: 500 })
  }
}
