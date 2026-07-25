import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/sales-orders/{id}/cancel
 * Cancel sales order.
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12). Outbox event (LAW-08).
 *
 * LAW-14: If order was already approved, cancellation is a reversal action
 * (not a direct edit). Original order retains its values.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const order = await db.salesOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!order) throw new NotFoundException('SalesOrder', params.id)

    // Can't cancel if already completed or cancelled
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new ValidationException('Cannot cancel completed or already cancelled order', [
        { field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' },
      ])
    }

    // LAW-11/12: Unit of Work
    await UnitOfWork.execute(async (uow) => {
      // LAW-07: Optimistic Lock
      const result = await uow.tx.salesOrder.updateMany({
        where: { id: order.id, version: order.version },
        data: {
          status: 'cancelled',
          version: { increment: 1 },
        },
      })

      if (result.count === 0) {
        throw new DomainException('Optimistic lock conflict', 'OPTIMISTIC_LOCK_FAILED', 409)
      }

      // Outbox event (LAW-08, LAW-15)
      // If order was approved, Financial needs to reverse any entries (LAW-13)
      // Inventory needs to release any reservations
      await uow.outbox.append({
        tenantId,
        aggregateType: 'SalesOrder',
        aggregateId: order.id,
        eventType: 'sales_order.cancelled',
        eventVersion: '1.0',
        payload: {
          orderNumber: order.orderNumber,
          previousStatus: order.status,
          reason: body.reason ?? null,
        },
        actorId: body.cancelledBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: 'cancelled',
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to cancel sales order', statusCode: 500 })
  }
}
