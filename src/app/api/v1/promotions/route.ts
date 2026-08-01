import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/promotions
 * List promotions with pagination.
 * Requires: marketing.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'marketing.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.promotion.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.promotion.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list promotions', statusCode: 500 })
  }
}

/**
 * POST /api/v1/promotions
 * Create a new promotion.
 * Required body: name, value, startDate, endDate
 * Optional: code (auto-generated if not provided), type, minOrderAmount, maxDiscountAmount,
 *           productCategoryIds, usageLimit, metadata
 * Requires: marketing.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + BusinessCodeGenerator (when code not provided) + validation.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'marketing.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation — required fields per Prisma schema
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.name) errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' })
    if (body.value === undefined || body.value === null) errors.push({ field: 'value', message: 'Value is required', code: 'REQUIRED' })
    if (!body.startDate) errors.push({ field: 'startDate', message: 'Start date is required', code: 'REQUIRED' })
    if (!body.endDate) errors.push({ field: 'endDate', message: 'End date is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Validate type enum
    const validTypes = ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y']
    if (body.type && !validTypes.includes(body.type)) {
      throw new ValidationException('Invalid type', [
        { field: 'type', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_ENUM' },
      ])
    }

    // Generate business code if not provided (LAW-02 — no hardcoded codes)
    const code = body.code || await BusinessCodeGenerator.generate('promotion', tenantId)

    const item = await db.promotion.create({
      data: {
        tenantId,
        name: body.name,
        code,
        type: body.type ?? 'percentage',
        value: Number(body.value),
        minOrderAmount: body.minOrderAmount ?? 0,
        maxDiscountAmount: body.maxDiscountAmount ?? null,
        productCategoryIds: body.productCategoryIds ?? null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        usageLimit: body.usageLimit ?? null,
        usedCount: 0,
        isActive: body.isActive ?? true,
        metadata: body.metadata ?? {},
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create promotion', statusCode: 500 })
  }
}
