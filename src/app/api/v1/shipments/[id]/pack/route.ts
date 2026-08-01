import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/shipments/{id}/pack
 * Pack picked items — transitions picking → packing.
 * Idempotent (LAW-06).
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
    if (shipment.status !== 'picking' && shipment.status !== 'packing') {
      throw new ValidationException('Shipment must be picking to pack', [
        { field: 'status', message: `Current: ${shipment.status}`, code: 'INVALID_STATE' },
      ])
    }

    // Verify all items are picked
    const unpicked = shipment.lines.filter((l) => l.quantityPicked < l.quantity)
    if (unpicked.length > 0) {
      throw new ValidationException(`${unpicked.length} lines not fully picked`, [
        { field: 'lines', message: `${unpicked.length} lines need picking`, code: 'NOT_PICKED' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.shipment.updateMany({
        where: { id: shipment.id, version: shipment.version },
        data: { status: 'packing', version: { increment: 1 } },
      })

      // Mark all lines as packed
      for (const line of shipment.lines) {
        await uow.tx.shipmentLine.update({
          where: { id: line.id },
          data: { quantityPacked: line.quantityPicked },
        })
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'Shipment', aggregateId: shipment.id,
        eventType: 'shipment.packed', eventVersion: '1.0',
        payload: { shipmentNumber: shipment.shipmentNumber },
        actorId: body.packedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: shipment.id, status: 'packing' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to pack shipment', statusCode: 500 })
  }
}
