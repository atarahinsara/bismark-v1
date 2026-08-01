import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/purchase-orders
 * List purchase orders with pagination.
 * Requires: procurement.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'procurement.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)

    const [items, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.purchaseOrder.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list purchase orders', statusCode: 500 })
  }
}

/**
 * POST /api/v1/purchase-orders
 * Create a new purchase order (draft).
 * Required body: supplierPartyId
 * Optional: expectedDeliveryDate, currencyCode, notes, metadata
 * Requires: procurement.create
 *
 * Audit v3 F-02 fix: replaced `data: { tenantId, ...body }` template pattern
 * with explicit whitelist + BusinessCodeGenerator + validation.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'procurement.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    // Validation — required fields per Prisma schema
    if (!body.supplierPartyId) {
      throw new ValidationException('Supplier is required', [
        { field: 'supplierPartyId', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Verify supplier (Party) exists — loose FK (LAW-01)
    const supplier = await db.party.findFirst({
      where: { id: body.supplierPartyId, tenantId, deletedAt: null },
    })
    if (!supplier) throw new NotFoundException('Party', body.supplierPartyId)

    // Generate business code (LAW-02)
    const poNumber = await BusinessCodeGenerator.generate('purchase_order', tenantId)

    const item = await db.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierPartyId: body.supplierPartyId,
        status: 'draft',
        orderDate: new Date(),
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
        receivedDate: null,
        totalAmount: 0,
        currencyCode: body.currencyCode ?? 'IRR',
        notes: body.notes ?? null,
        metadata: body.metadata ?? {},
        version: 1,
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create purchase order', statusCode: 500 })
  }
}
