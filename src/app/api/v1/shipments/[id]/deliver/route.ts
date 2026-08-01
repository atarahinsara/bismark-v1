import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/shipments/{id}/deliver
 * Confirm delivery — transitions shipped → delivered.
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12).
 * LAW-18: Shipment is already immutable, but status can transition to 'delivered'.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'fulfillment.manage')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const shipment = await db.shipment.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!shipment) throw new NotFoundException('Shipment', params.id)
    if (shipment.status !== 'shipped') {
      throw new ValidationException('Shipment must be shipped to deliver', [
        { field: 'status', message: `Current: ${shipment.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.shipment.updateMany({
        where: { id: shipment.id, version: shipment.version },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          actualArrival: new Date(),
          version: { increment: 1 },
        },
      })

      // Update line delivered quantities
      for (const line of shipment.lines) {
        await uow.tx.shipmentLine.update({
          where: { id: line.id },
          data: { quantityDelivered: line.quantityShipped },
        })
      }

      // Update sales order status if fully delivered
      if (shipment.salesOrderId) {
        const order = await uow.tx.salesOrder.findUnique({ where: { id: shipment.salesOrderId } })
        if (order && order.status === 'shipped') {
          await uow.tx.salesOrder.update({
            where: { id: order.id },
            data: { status: 'completed', actualDelivery: new Date() },
          })
        }
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'Shipment', aggregateId: shipment.id,
        eventType: 'shipment.delivered', eventVersion: '1.0',
        payload: { shipmentNumber: shipment.shipmentNumber },
        actorId: body.deliveredBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: shipment.id, status: 'delivered' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to deliver shipment', statusCode: 500 })
  }
}
