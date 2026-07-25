import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/service-orders/{id}/consume-part
 * LAW-31: No Part Consumption Without Inventory Ledger Event.
 *
 * When a technician uses a part, this endpoint:
 *   1. Creates OUT InventoryTransaction (ledger entry)
 *   2. Creates ServiceOrderPart record
 *   3. Both in same UnitOfWork (LAW-12)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.productId) throw new ValidationException('Product is required', [{ field: 'productId', message: 'Required', code: 'REQUIRED' }])
    if (!body.quantityUsed || body.quantityUsed <= 0) throw new ValidationException('Quantity must be positive', [{ field: 'quantityUsed', message: 'Must be > 0', code: 'INVALID' }])
    if (!body.warehouseId) throw new ValidationException('Warehouse is required', [{ field: 'warehouseId', message: 'Required', code: 'REQUIRED' }])

    const order = await db.serviceOrder.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!order) throw new NotFoundException('ServiceOrder', params.id)
    if (order.status !== 'repair' && order.status !== 'diagnosis' && order.status !== 'waiting_parts') {
      throw new ValidationException('Order must be in repair/diagnosis to consume parts', [{ field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' }])
    }

    // Find stock item
    const stockItem = await db.stockItem.findFirst({
      where: { tenantId, warehouseId: body.warehouseId, productId: body.productId, deletedAt: null },
    })
    if (!stockItem) throw new NotFoundException('StockItem', `product:${body.productId}`)

    const txnNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)
    const unitCost = body.unitCost ?? 0
    const totalCost = body.quantityUsed * unitCost

    await UnitOfWork.execute(async (uow) => {
      // LAW-31: Create OUT InventoryTransaction (ledger entry — not direct stock update)
      await uow.tx.inventoryTransaction.create({
        data: {
          tenantId, transactionNumber: `${txnNumber}-OUT-SVC-${order.orderNumber}`,
          transactionType: 'OUT',
          stockItemId: stockItem.id,
          productId: body.productId,
          productInstanceId: body.productInstanceId ?? null,
          fromWarehouseId: body.warehouseId,
          batchNumber: body.batchNumber ?? null,
          quantity: -Math.abs(body.quantityUsed), // negative for OUT
          reason: `Service Order ${order.orderNumber} — parts consumption`,
          referenceType: 'service_order',
          referenceId: order.id,
        },
      })

      // Create ServiceOrderPart record
      await uow.tx.serviceOrderPart.create({
        data: {
          tenantId, serviceOrderId: order.id,
          productId: body.productId,
          productInstanceId: body.productInstanceId ?? null,
          fromWarehouseId: body.warehouseId,
          quantityUsed: body.quantityUsed,
          unitCost, totalCost,
          isWarrantyCovered: body.isWarrantyCovered ?? false,
          notes: body.notes ?? null,
        },
      })

      // Update order parts cost
      await uow.tx.serviceOrder.updateMany({
        where: { id: order.id, version: order.version },
        data: { partsCost: { increment: totalCost }, totalCost: { increment: totalCost }, version: { increment: 1 } },
      })

      // Outbox event
      await uow.outbox.append({
        tenantId, aggregateType: 'ServiceOrder', aggregateId: order.id,
        eventType: 'service_order.part_consumed', eventVersion: '1.0',
        payload: { orderNumber: order.orderNumber, productId: body.productId, quantity: body.quantityUsed, totalCost },
        actorId: body.technicianId ?? null,
      })
    })

    const response = jsonResponse({
      data: { id: order.id, status: 'part consumed', message: 'Part consumed. OUT ledger entry created (LAW-31). Inventory updated via ledger.' },
    })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to consume part', statusCode: 500 })
  }
}
