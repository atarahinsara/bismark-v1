import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/goods-receipts
 * List goods receipts with pagination.
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
      db.goodsReceipt.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.goodsReceipt.count({ where: { tenantId } }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list goods receipts', statusCode: 500 })
  }
}

/**
 * POST /api/v1/goods-receipts
 * Create a new goods receipt (pending).
 * Required body: purchaseOrderId, warehouseId
 * Optional: receivedBy, notes, metadata
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
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.purchaseOrderId) errors.push({ field: 'purchaseOrderId', message: 'Purchase order is required', code: 'REQUIRED' })
    if (!body.warehouseId) errors.push({ field: 'warehouseId', message: 'Warehouse is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Verify purchase order exists — FK constraint (Prisma relation)
    const purchaseOrder = await db.purchaseOrder.findFirst({
      where: { id: body.purchaseOrderId, tenantId },
    })
    if (!purchaseOrder) throw new NotFoundException('PurchaseOrder', body.purchaseOrderId)

    const warehouse = await db.warehouse.findFirst({
      where: { id: body.warehouseId, tenantId },
    })
    if (!warehouse) throw new NotFoundException('Warehouse', body.warehouseId)

    // Generate business code (LAW-02)
    const grNumber = await BusinessCodeGenerator.generate('goods_receipt', tenantId)

    const item = await db.goodsReceipt.create({
      data: {
        tenantId,
        grNumber,
        purchaseOrderId: body.purchaseOrderId,
        warehouseId: body.warehouseId,
        receivedDate: new Date(),
        receivedBy: body.receivedBy ?? null,
        status: 'pending',
        qualityCheckStatus: 'pending',
        notes: body.notes ?? null,
        metadata: body.metadata ?? {},
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create goods receipt', statusCode: 500 })
  }
}
