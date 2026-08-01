import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/stock-items/{id}/balance
 * Get derived balance for a stock item (LAW-05: from ledger).
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.read')

    const tenantId = await getTenantId()
    const item = await db.stockItem.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { warehouse: true, location: true },
    })
    if (!item) throw new NotFoundException('StockItem', params.id)

    // LAW-05: Derive from ledger
    const ledgerSum = await db.inventoryTransaction.aggregate({
      where: { stockItemId: item.id },
      _sum: { quantity: true },
    })
    const onHand = ledgerSum._sum.quantity ?? 0
    const available = onHand - item.reservedQuantity

    // Get transaction count + last transaction
    const txnCount = await db.inventoryTransaction.count({ where: { stockItemId: item.id } })
    const lastTxn = await db.inventoryTransaction.findFirst({
      where: { stockItemId: item.id },
      orderBy: { occurredAt: 'desc' },
    })

    return jsonResponse({
      data: {
        stockItemId: item.id,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse?.name ?? null,
        productId: item.productId,
        productInstanceId: item.productInstanceId,
        batchNumber: item.batchNumber,
        onHandQuantity: onHand,
        reservedQuantity: item.reservedQuantity,
        availableQuantity: available,
        isAvailable: available > 0,
        status: item.status,
        transactionCount: txnCount,
        lastTransactionAt: lastTxn?.occurredAt.toISOString() ?? null,
        lastTransactionNumber: lastTxn?.transactionNumber ?? null,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get balance', statusCode: 500 })
  }
}
