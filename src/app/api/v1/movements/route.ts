import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/movements
 * Inventory Movement History — aggregates all stock movements across the system.
 *
 * Sources:
 *   - InventoryTransaction (ledger entries: IN, OUT, TRANSFER, etc.)
 *   - StockTransfer (warehouse/zone/bin transfers)
 *
 * This is a query endpoint (read-only) that combines data from multiple sources
 * without cross-context JOINs (LAW-01) — it uses application-level aggregation.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const productId = url.searchParams.get('product_id')
    const warehouseId = url.searchParams.get('warehouse_id')
    const transactionType = url.searchParams.get('transaction_type')

    // Build where clause for inventory transactions
    const txnWhere: any = {
      tenantId,
      ...(productId ? { productId } : {}),
      ...(transactionType ? { transactionType } : {}),
    }

    // Filter by warehouse (from or to)
    if (warehouseId) {
      txnWhere.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ]
    }

    const [transactions, total] = await Promise.all([
      db.inventoryTransaction.findMany({
        where: txnWhere,
        orderBy: { occurredAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.inventoryTransaction.count({ where: txnWhere }),
    ])

    return jsonResponse({
      data: transactions.map((t) => ({
        id: t.id,
        movementNumber: t.transactionNumber,
        movementType: t.transactionType,
        productId: t.productId,
        productInstanceId: t.productInstanceId,
        fromWarehouseId: t.fromWarehouseId,
        toWarehouseId: t.toWarehouseId,
        quantity: t.quantity,
        unitCost: t.unitCost,
        reason: t.reason,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        occurredAt: t.occurredAt.toISOString(),
      })),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list movements', statusCode: 500 })
  }
}
