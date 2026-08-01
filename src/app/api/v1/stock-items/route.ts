import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { getProductQueryService } from '@/lib/modules/product/services/product-query-service'

/**
 * GET /api/v1/stock-items
 * List stock items with derived balances from ledger.
 *
 * LAW-05: on_hand_quantity is NOT stored — computed from InventoryTransaction ledger.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const warehouseId = url.searchParams.get('warehouse_id')
    const productId = url.searchParams.get('product_id')

    const where = {
      tenantId,
      deletedAt: null,
      ...(warehouseId ? { warehouseId } : {}),
      ...(productId ? { productId } : {}),
    }

    const stockItems = await db.stockItem.findMany({
      where,
      include: { warehouse: true, location: true },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    })

    // LAW-05: Derive on_hand from ledger
    const itemsWithBalance = await Promise.all(
      stockItems.map(async (item) => {
        const ledgerSum = await db.inventoryTransaction.aggregate({
          where: { stockItemId: item.id },
          _sum: { quantity: true },
        })
        const onHand = ledgerSum._sum.quantity ?? 0
        const available = onHand - item.reservedQuantity
        return {
          ...toDTO(item),
          onHandQuantity: onHand,
          availableQuantity: available,
          isAvailable: available > 0,
        }
      }),
    )

    const total = await db.stockItem.count({ where })

    return jsonResponse({
      data: itemsWithBalance,
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list stock items', statusCode: 500 })
  }
}

/**
 * POST /api/v1/stock-items
 * Create a new stock item (NO quantity — that's in the ledger).
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    // Validation
    if (!body.warehouseId) throw new ValidationException('Warehouse is required', [
      { field: 'warehouseId', message: 'Warehouse is required', code: 'REQUIRED' },
    ])
    if (!body.productId) throw new ValidationException('Product is required', [
      { field: 'productId', message: 'Product is required', code: 'REQUIRED' },
    ])

    // LAW-04: Use Contract, not ProductRepository
    const productQuery = getProductQueryService()
    const product = await productQuery.findProductOrFail(body.productId)

    // Verify warehouse exists
    const warehouse = await db.warehouse.findFirst({
      where: { id: body.warehouseId, tenantId, deletedAt: null },
    })
    if (!warehouse) throw new NotFoundException('Warehouse', body.warehouseId)

    // For serialized products, productInstanceId is required
    if (product.productType === 'serialized') {
      if (!body.productInstanceId) {
        throw new ValidationException('Product instance required for serialized products', [
          { field: 'productInstanceId', message: 'Required for serialized products', code: 'REQUIRED' },
        ])
      }
      // Verify instance exists (LAW-04: via Contract)
      const instance = await productQuery.findProductInstance(body.productInstanceId)
      if (!instance) throw new NotFoundException('ProductInstance', body.productInstanceId)
    }

    const stockItem = await db.stockItem.create({
      data: {
        tenantId,
        warehouseId: body.warehouseId,
        locationId: body.locationId ?? null,
        binId: body.binId ?? null,
        productId: body.productId,
        productInstanceId: body.productInstanceId ?? null,
        batchNumber: body.batchNumber ?? null,
        reservedQuantity: 0,
        status: body.status ?? 'available',
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        metadata: {},
      },
      include: { warehouse: true, location: true },
    })

    return jsonResponse({ data: toDTO(stockItem) }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create stock item', statusCode: 500 })
  }
}

function toDTO(item: any) {
  return {
    id: item.id,
    tenantId: item.tenantId,
    warehouseId: item.warehouseId,
    warehouseName: item.warehouse?.name ?? null,
    warehouseCode: item.warehouse?.code ?? null,
    locationId: item.locationId,
    locationPath: item.location?.fullPath ?? null,
    binId: item.binId,
    productId: item.productId,
    productInstanceId: item.productInstanceId,
    batchNumber: item.batchNumber,
    reservedQuantity: item.reservedQuantity,
    status: item.status,
    receivedDate: item.receivedDate?.toISOString() ?? null,
    expiryDate: item.expiryDate?.toISOString() ?? null,
    lastTransactionAt: item.lastTransactionAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
