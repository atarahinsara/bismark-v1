import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/coupons
 * List coupons with pagination.
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
      db.coupon.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.coupon.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list coupons', statusCode: 500 })
  }
}

/**
 * POST /api/v1/coupons
 * Create a new coupon for a promotion.
 * Required body: promotionId
 * Optional: code (auto-generated if not provided), customerId, expiresAt
 * Requires: marketing.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + BusinessCodeGenerator (when code not provided) + validation.
 *
 * NOTE: Coupon.code is globally @unique (not tenant-scoped). Generated codes use the
 * CPN- prefix with 6-digit padding to minimize collision risk.
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
    if (!body.promotionId) {
      throw new ValidationException('Promotion is required', [
        { field: 'promotionId', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Verify promotion exists — FK constraint (Prisma relation)
    const promotion = await db.promotion.findFirst({
      where: { id: body.promotionId, tenantId },
    })
    if (!promotion) throw new NotFoundException('Promotion', body.promotionId)

    // Generate business code if not provided (LAW-02 — no hardcoded codes)
    const code = body.code || await BusinessCodeGenerator.generate('coupon', tenantId)

    const item = await db.coupon.create({
      data: {
        tenantId,
        promotionId: body.promotionId,
        code,
        customerId: body.customerId ?? null,
        usedAt: null,
        usedBy: null,
        status: 'active',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create coupon', statusCode: 500 })
  }
}
