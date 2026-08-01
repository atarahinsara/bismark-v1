/**
 * GET /api/v1/van-stock/[technicianId]
 * Get van stock balance for a technician.
 *
 * POST /api/v1/van-stock/[technicianId]
 * Restock van stock (add parts to van).
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { restockVanStock, getVanStockBalance, getVanStockLedger } from '@/lib/van-stock-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ technicianId: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.read')

    const { technicianId } = await params
    const tenantId = await getTenantId()

    const balance = await getVanStockBalance(tenantId, technicianId)
    const url = new URL(request.url)
    const includeLedger = url.searchParams.get('includeLedger') === 'true'

    let ledger = null
    if (includeLedger) {
      ledger = await getVanStockLedger(tenantId, technicianId)
    }

    return jsonResponse({
      data: {
        technicianId,
        items: balance,
        ...(ledger ? { ledger } : {}),
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get van stock', statusCode: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ technicianId: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.adjust')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { technicianId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    // Validation
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.productId) errors.push({ field: 'productId', message: 'Product is required', code: 'REQUIRED' })
    if (!body.quantity || body.quantity <= 0) errors.push({ field: 'quantity', message: 'Must be positive', code: 'INVALID' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    const result = await restockVanStock({
      tenantId,
      technicianId,
      productId: body.productId,
      quantity: Number(body.quantity),
      referenceType: body.referenceType ?? 'manual_restock',
      referenceId: body.referenceId ?? null,
      performedBy: ctx.userId,
      notes: body.notes ?? null,
    })

    const responseBody = JSON.stringify({
      data: {
        message: 'Van stock restocked',
        vanStockId: result.vanStockId,
        newQuantity: result.newQuantity,
        ledgerId: result.ledgerId,
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    if (e instanceof Error && e.message.includes('Insufficient')) {
      return errorResponse({ code: 'INSUFFICIENT_STOCK', message: e.message, statusCode: 409 })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to restock van', statusCode: 500 })
  }
}
