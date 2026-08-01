import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/shipments/{id}/pick
 * Pick items — transitions draft → picking → (all picked) → packing-ready.
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12).
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
    if (shipment.status !== 'draft' && shipment.status !== 'picking') {
      throw new ValidationException('Shipment must be draft or picking to pick', [
        { field: 'status', message: `Current: ${shipment.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      // Update shipment status
      await uow.tx.shipment.updateMany({
        where: { id: shipment.id, version: shipment.version },
        data: { status: 'picking', version: { increment: 1 } },
      })

      // Update line picked quantities from body
      if (body.lines && Array.isArray(body.lines)) {
        for (const entry of body.lines) {
          await uow.tx.shipmentLine.update({
            where: { id: entry.lineId },
            data: { quantityPicked: entry.quantityPicked ?? 0 },
          })
        }
      } else {
        // Auto-pick all lines (full pick)
        for (const line of shipment.lines) {
          await uow.tx.shipmentLine.update({
            where: { id: line.id },
            data: { quantityPicked: line.quantity },
          })
        }
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'Shipment', aggregateId: shipment.id,
        eventType: 'shipment.picked', eventVersion: '1.0',
        payload: { shipmentNumber: shipment.shipmentNumber },
        actorId: body.pickedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: shipment.id, status: 'picking' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to pick shipment', statusCode: 500 })
  }
}
