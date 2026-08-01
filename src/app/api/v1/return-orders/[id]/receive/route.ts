import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/return-orders/{id}/receive
 * Receive returned goods — creates IN InventoryTransaction (LAW-16).
 * LAW-22: All lines must be inspected before receipt.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'return.receive')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    const ret = await db.returnOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!ret) throw new NotFoundException('ReturnOrder', params.id)
    if (ret.status !== 'approved') {
      throw new ValidationException('Return must be approved to receive', [
        { field: 'status', message: `Current: ${ret.status}`, code: 'INVALID_STATE' },
      ])
    }

    // LAW-22: Check all lines are inspected
    const uninspected = ret.lines.filter((l) => !l.isInspected)
    if (uninspected.length > 0) {
      throw new ValidationException(`${uninspected.length} lines not inspected (LAW-22)`, [
        { field: 'inspection', message: 'All lines must be inspected before receipt', code: 'NOT_INSPECTED' },
      ])
    }

    if (!body.warehouseId) throw new ValidationException('Warehouse required for receipt', [
      { field: 'warehouseId', message: 'Required', code: 'REQUIRED' },
    ])

    let ledgerEntriesCreated = 0

    await UnitOfWork.execute(async (uow) => {
      const txnNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)

      for (const line of ret.lines) {
        // Find or create stock item in warehouse
        const stockItem = await uow.tx.stockItem.findFirst({
          where: { tenantId, warehouseId: body.warehouseId, productId: line.productId, productInstanceId: line.productInstanceId ?? null, deletedAt: null },
        })

        let stockItemId: string
        if (stockItem) {
          stockItemId = stockItem.id
        } else {
          const newStock = await uow.tx.stockItem.create({
            data: { tenantId, warehouseId: body.warehouseId, productId: line.productId, productInstanceId: line.productInstanceId, status: 'available', metadata: {} },
          })
          stockItemId = newStock.id
        }

        // LAW-16: Create IN ledger entry
        await uow.tx.inventoryTransaction.create({
          data: {
            tenantId, transactionNumber: `${txnNumber}-IN-${line.id.slice(-6)}`,
            transactionType: 'IN', stockItemId,
            productId: line.productId, productInstanceId: line.productInstanceId,
            toWarehouseId: body.warehouseId,
            quantity: Math.abs(line.quantityReturned),
            reason: `Return receipt ${ret.returnNumber}`,
            referenceType: 'return_order', referenceId: ret.id,
          },
        })
        ledgerEntriesCreated++
      }

      await uow.tx.returnOrder.updateMany({
        where: { id: ret.id, version: ret.version },
        data: { status: 'received', receivedAt: new Date(), receivedBy: body.receivedBy ?? null, version: { increment: 1 } },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ReturnOrder', aggregateId: ret.id,
        eventType: 'return_order.received', eventVersion: '1.0',
        payload: { returnNumber: ret.returnNumber, ledgerEntriesCreated },
        actorId: body.receivedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        id: ret.id, returnNumber: ret.returnNumber, status: 'received',
        ledgerEntriesCreated,
        message: 'Return received. IN ledger entries created (LAW-16). Inventory updated.',
      },
    })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to receive return', statusCode: 500 })
  }
}
