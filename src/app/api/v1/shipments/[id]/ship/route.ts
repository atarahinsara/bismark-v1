import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/shipments/{id}/ship
 *
 * CRITICAL: This is where LAW-16 is enforced.
 * Shipping creates OUT InventoryTransaction ledger entries for each line.
 * No physical movement without ledger event.
 *
 * Flow (all in one UnitOfWork — LAW-12):
 *   1. Verify shipment is in 'packing' status
 *   2. For each line:
 *      a. Find StockItem in source warehouse
 *      b. Create OUT InventoryTransaction (negative quantity)
 *      c. Update ShipmentLine.quantityShipped
 *   3. Update Shipment status → 'shipped' (LAW-18: immutable after this)
 *   4. Consume StockReservation (LAW-17: release after ship)
 *   5. Update SalesOrder line quantityShipped + status
 *   6. Append Outbox events (LAW-08, LAW-15)
 *
 * Idempotent (LAW-06). Optimistic Lock (LAW-07).
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
    if (shipment.status !== 'packing') {
      throw new ValidationException('Shipment must be in packing status to ship', [
        { field: 'status', message: `Current: ${shipment.status}`, code: 'INVALID_STATE' },
      ])
    }

    // Verify all lines are packed
    const unpacked = shipment.lines.filter((l) => l.quantityPacked < l.quantity)
    if (unpacked.length > 0) {
      throw new ValidationException(`${unpacked.length} lines not fully packed`, [
        { field: 'lines', message: 'All lines must be packed before shipping', code: 'NOT_PACKED' },
      ])
    }

    let ledgerEntriesCreated = 0

    // LAW-11/12: Application Service + Unit of Work
    await UnitOfWork.execute(async (uow) => {
      const txnNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)

      // LAW-16: Create OUT ledger entries for each line (no physical movement without ledger)
      for (const line of shipment.lines) {
        // Find the stock item in source warehouse
        const stockItem = await uow.tx.stockItem.findFirst({
          where: {
            tenantId,
            warehouseId: shipment.fromWarehouseId,
            productId: line.productId,
            productInstanceId: line.productInstanceId ?? null,
            deletedAt: null,
          },
        })

        if (!stockItem) {
          throw new ValidationException(`No stock item found for product ${line.productId} in warehouse`, [
            { field: 'stockItem', message: 'Stock item not found', code: 'NO_STOCK' },
          ])
        }

        // LAW-16: Create OUT ledger entry (append-only — LAW-05)
        await uow.tx.inventoryTransaction.create({
          data: {
            tenantId,
            transactionNumber: `${txnNumber}-OUT-${line.id.slice(-6)}`,
            transactionType: 'OUT',
            stockItemId: stockItem.id,
            productId: line.productId,
            productInstanceId: line.productInstanceId,
            fromWarehouseId: shipment.fromWarehouseId,
            batchNumber: line.batchNumber,
            quantity: -Math.abs(line.quantity), // negative for OUT
            reason: `Shipment ${shipment.shipmentNumber}`,
            referenceType: 'shipment',
            referenceId: shipment.id,
          },
        })

        // Update shipment line
        await uow.tx.shipmentLine.update({
          where: { id: line.id },
          data: { quantityShipped: line.quantity },
        })

        ledgerEntriesCreated++
      }

      // LAW-18: Mark shipment as shipped (immutable after this)
      await uow.tx.shipment.updateMany({
        where: { id: shipment.id, version: shipment.version },
        data: {
          status: 'shipped',
          shippedAt: new Date(),
          trackingNumber: body.trackingNumber ?? null,
          shippingMethod: body.shippingMethod ?? shipment.shippingMethod,
          version: { increment: 1 },
        },
      })

      // LAW-17: Consume reservation
      if (shipment.salesOrderId) {
        const reservations = await uow.tx.stockReservation.findMany({
          where: { referenceType: 'sales_order', referenceId: shipment.salesOrderId, status: 'active' },
        })
        for (const res of reservations) {
          await uow.tx.stockReservation.update({
            where: { id: res.id },
            data: { status: 'consumed', consumedAt: new Date() },
          })
          // Decrement reserved quantity on stock item
          await uow.tx.stockItem.update({
            where: { id: res.stockItemId },
            data: { reservedQuantity: { decrement: res.reservedQuantity } },
          })
        }

        // Update sales order status + shipped quantities
        const order = await uow.tx.salesOrder.findUnique({
          where: { id: shipment.salesOrderId },
          include: { lines: true },
        })
        if (order) {
          for (const line of shipment.lines) {
            if (line.salesOrderLineId) {
              const orderLine = order.lines.find((l) => l.id === line.salesOrderLineId)
              if (orderLine) {
                await uow.tx.salesOrderLine.update({
                  where: { id: orderLine.id },
                  data: { quantityShipped: { increment: line.quantity } },
                })
              }
            }
          }

          // Check if fully shipped
          const updatedLines = await uow.tx.salesOrderLine.findMany({ where: { salesOrderId: order.id } })
          const allShipped = updatedLines.every((l) => l.quantityShipped >= l.quantityOrdered)
          await uow.tx.salesOrder.update({
            where: { id: order.id },
            data: { status: allShipped ? 'shipped' : 'partially_shipped' },
          })
        }
      }

      // Outbox events (LAW-08, LAW-15)
      await uow.outbox.append({
        tenantId, aggregateType: 'Shipment', aggregateId: shipment.id,
        eventType: 'shipment.shipped', eventVersion: '1.0',
        payload: {
          shipmentNumber: shipment.shipmentNumber,
          ledgerEntriesCreated,
          salesOrderId: shipment.salesOrderId,
        },
        actorId: body.shippedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        status: 'shipped',
        ledgerEntriesCreated,
        message: 'Shipment shipped. OUT ledger entries created (LAW-16). Shipment is now immutable (LAW-18).',
      },
    })

    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to ship shipment', statusCode: 500 })
  }
}
