import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/inventory-transactions
 * List ledger entries (append-only history).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const stockItemId = url.searchParams.get('stock_item_id')
    const productId = url.searchParams.get('product_id')
    const transactionType = url.searchParams.get('transaction_type')

    const where = {
      tenantId,
      ...(stockItemId ? { stockItemId } : {}),
      ...(productId ? { productId } : {}),
      ...(transactionType ? { transactionType } : {}),
    }

    const [transactions, total] = await Promise.all([
      db.inventoryTransaction.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.inventoryTransaction.count({ where }),
    ])

    return jsonResponse({
      data: transactions.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list transactions', statusCode: 500 })
  }
}

/**
 * POST /api/v1/inventory-transactions
 * Append a new transaction to the ledger (LAW-05: append-only, no UPDATE on quantities).
 *
 * Transaction types:
 *   IN          — receive stock (positive quantity)
 *   OUT         — issue stock (negative quantity)
 *   TRANSFER    — move between warehouses (two entries: OUT from source, IN to destination)
 *   ADJUSTMENT  — correct discrepancy (positive or negative)
 *   COUNT       — physical count result (adjustment)
 *   RESERVATION — reserve stock (tracks in reservedQuantity on StockItem)
 *   RELEASE     — release reservation (reduces reservedQuantity)
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    // Validation
    if (!body.stockItemId) throw new ValidationException('Stock item is required', [
      { field: 'stockItemId', message: 'Stock item is required', code: 'REQUIRED' },
    ])
    if (body.quantity === undefined || body.quantity === null) throw new ValidationException('Quantity is required', [
      { field: 'quantity', message: 'Quantity is required', code: 'REQUIRED' },
    ])

    const validTypes = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'COUNT', 'RESERVATION', 'RELEASE']
    if (!body.transactionType || !validTypes.includes(body.transactionType)) {
      throw new ValidationException('Invalid transaction type', [
        { field: 'transactionType', message: `Must be one of: ${validTypes.join(', ')}`, code: 'INVALID' },
      ])
    }

    // Verify stock item exists
    const stockItem = await db.stockItem.findFirst({
      where: { id: body.stockItemId, tenantId, deletedAt: null },
    })
    if (!stockItem) throw new NotFoundException('StockItem', body.stockItemId)

    // Generate business code
    const transactionNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)

    // For TRANSFER, create two entries (OUT from source, IN to destination)
    if (body.transactionType === 'TRANSFER' && body.toWarehouseId) {
      return await handleTransfer(body, stockItem, tenantId, transactionNumber)
    }

    // For RESERVATION/RELEASE, update reservedQuantity on StockItem
    if (body.transactionType === 'RESERVATION') {
      await db.stockItem.update({
        where: { id: stockItem.id },
        data: { reservedQuantity: { increment: Math.abs(body.quantity) } },
      })
    } else if (body.transactionType === 'RELEASE') {
      await db.stockItem.update({
        where: { id: stockItem.id },
        data: { reservedQuantity: { decrement: Math.abs(body.quantity) } },
      })
    }

    // Append to ledger (LAW-05: append-only)
    const transaction = await db.inventoryTransaction.create({
      data: {
        tenantId,
        transactionNumber,
        transactionType: body.transactionType,
        stockItemId: body.stockItemId,
        productId: stockItem.productId,
        productInstanceId: stockItem.productInstanceId ?? body.productInstanceId,
        fromWarehouseId: body.fromWarehouseId ?? null,
        fromLocationId: body.fromLocationId ?? null,
        toWarehouseId: body.toWarehouseId ?? null,
        toLocationId: body.toLocationId ?? null,
        batchNumber: body.batchNumber ?? stockItem.batchNumber,
        quantity: body.quantity,
        unitCost: body.unitCost ?? null,
        reason: body.reason ?? null,
        referenceType: body.referenceType ?? null,
        referenceId: body.referenceId ?? null,
        performedBy: body.performedBy ?? null,
        metadata: {},
      },
    })

    // Update lastTransactionAt on stock item
    await db.stockItem.update({
      where: { id: stockItem.id },
      data: { lastTransactionAt: new Date() },
    })

    return jsonResponse({ data: toDTO(transaction) }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create transaction', statusCode: 500 })
  }
}

/**
 * Handle TRANSFER: creates two ledger entries (OUT + IN).
 */
async function handleTransfer(
  body: any,
  sourceItem: any,
  tenantId: string,
  transactionNumber: string,
) {
  // Verify destination warehouse
  const destWarehouse = await db.warehouse.findFirst({
    where: { id: body.toWarehouseId, tenantId, deletedAt: null },
  })
  if (!destWarehouse) throw new NotFoundException('Warehouse', body.toWarehouseId)

  // Find or create destination stock item
  const destItem = await db.stockItem.upsert({
    where: {
      tenantId_warehouseId_productId_productInstanceId_batchNumber: {
        tenantId,
        warehouseId: body.toWarehouseId,
        productId: sourceItem.productId,
        productInstanceId: sourceItem.productInstanceId ?? '',
        batchNumber: sourceItem.batchNumber ?? '',
      },
    },
    update: {},
    create: {
      tenantId,
      warehouseId: body.toWarehouseId,
      productId: sourceItem.productId,
      productInstanceId: sourceItem.productInstanceId,
      batchNumber: sourceItem.batchNumber,
      status: 'available',
      metadata: {},
    },
  })

  const qty = Math.abs(body.quantity)

  // Two ledger entries in a transaction
  const result = await db.$transaction(async (tx) => {
    // OUT from source
    const outTxn = await tx.inventoryTransaction.create({
      data: {
        tenantId,
        transactionNumber: `${transactionNumber}-OUT`,
        transactionType: 'OUT',
        stockItemId: sourceItem.id,
        productId: sourceItem.productId,
        productInstanceId: sourceItem.productInstanceId,
        fromWarehouseId: sourceItem.warehouseId,
        fromLocationId: sourceItem.locationId,
        toWarehouseId: body.toWarehouseId,
        toLocationId: body.toLocationId ?? null,
        batchNumber: sourceItem.batchNumber,
        quantity: -qty,  // negative for OUT
        unitCost: body.unitCost ?? null,
        reason: body.reason ?? 'TRANSFER',
        referenceType: 'transfer',
        referenceId: transactionNumber,
      },
    })

    // IN to destination
    const inTxn = await tx.inventoryTransaction.create({
      data: {
        tenantId,
        transactionNumber: `${transactionNumber}-IN`,
        transactionType: 'IN',
        stockItemId: destItem.id,
        productId: sourceItem.productId,
        productInstanceId: sourceItem.productInstanceId,
        fromWarehouseId: sourceItem.warehouseId,
        fromLocationId: sourceItem.locationId,
        toWarehouseId: body.toWarehouseId,
        toLocationId: body.toLocationId ?? null,
        batchNumber: sourceItem.batchNumber,
        quantity: qty,  // positive for IN
        unitCost: body.unitCost ?? null,
        reason: body.reason ?? 'TRANSFER',
        referenceType: 'transfer',
        referenceId: transactionNumber,
      },
    })

    // Update lastTransactionAt on both
    await tx.stockItem.update({ where: { id: sourceItem.id }, data: { lastTransactionAt: new Date() } })
    await tx.stockItem.update({ where: { id: destItem.id }, data: { lastTransactionAt: new Date() } })

    return { outTxn, inTxn }
  })

  return jsonResponse({
    data: {
      transferNumber: transactionNumber,
      out: toDTO(result.outTxn),
      in: toDTO(result.inTxn),
    },
  }, 201)
}

function toDTO(txn: any) {
  return {
    id: txn.id,
    tenantId: txn.tenantId,
    transactionNumber: txn.transactionNumber,
    transactionType: txn.transactionType,
    stockItemId: txn.stockItemId,
    productId: txn.productId,
    productInstanceId: txn.productInstanceId,
    fromWarehouseId: txn.fromWarehouseId,
    fromLocationId: txn.fromLocationId,
    toWarehouseId: txn.toWarehouseId,
    toLocationId: txn.toLocationId,
    batchNumber: txn.batchNumber,
    quantity: txn.quantity,
    unitCost: txn.unitCost,
    reason: txn.reason,
    referenceType: txn.referenceType,
    referenceId: txn.referenceId,
    performedBy: txn.performedBy,
    occurredAt: txn.occurredAt.toISOString(),
    createdAt: txn.createdAt.toISOString(),
  }
}
