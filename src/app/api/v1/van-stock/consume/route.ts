/**
 * POST /api/v1/van-stock/consume
 * Consume parts from van stock for a technician job.
 *
 * Body: { technicianId, productId, quantity, technicianJobId, notes? }
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { consumeVanStock } from '@/lib/van-stock-service'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.adjust')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    // Validation
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.technicianId) errors.push({ field: 'technicianId', message: 'Required', code: 'REQUIRED' })
    if (!body.productId) errors.push({ field: 'productId', message: 'Required', code: 'REQUIRED' })
    if (!body.quantity || body.quantity <= 0) errors.push({ field: 'quantity', message: 'Must be positive', code: 'INVALID' })
    if (!body.technicianJobId) errors.push({ field: 'technicianJobId', message: 'Required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Verify job exists
    const job = await db.technicianJob.findFirst({
      where: { id: body.technicianJobId, tenantId },
    })
    if (!job) throw new NotFoundException('TechnicianJob', body.technicianJobId)

    const result = await consumeVanStock({
      tenantId,
      technicianId: body.technicianId,
      productId: body.productId,
      quantity: Number(body.quantity),
      technicianJobId: body.technicianJobId,
      performedBy: ctx.userId,
      notes: body.notes ?? null,
    })

    // Emit outbox event (LAW-31: part consumption must produce ledger event)
    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'VanStock',
        aggregateId: result.vanStockId,
        eventType: 'van_stock.consumed',
        eventVersion: '1.0',
        payload: {
          vanStockId: result.vanStockId,
          technicianId: body.technicianId,
          productId: body.productId,
          quantity: body.quantity,
          newBalance: result.newQuantity,
          technicianJobId: body.technicianJobId,
          ledgerId: result.ledgerId,
        },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    const responseBody = JSON.stringify({
      data: {
        message: 'Parts consumed from van stock',
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
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to consume van stock', statusCode: 500 })
  }
}
