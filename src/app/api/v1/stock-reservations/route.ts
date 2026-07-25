import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * GET /api/v1/stock-reservations
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const stockItemId = url.searchParams.get('stock_item_id')

    const where = {
      tenantId,
      ...(status ? { status } : {}),
      ...(stockItemId ? { stockItemId } : {}),
    }

    const [reservations, total] = await Promise.all([
      db.stockReservation.findMany({
        where,
        orderBy: { reservedAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.stockReservation.count({ where }),
    ])

    return jsonResponse({
      data: reservations.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list reservations', statusCode: 500 })
  }
}

/**
 * POST /api/v1/stock-reservations
 * Create a new reservation (independent aggregate — not inside StockItem).
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.stockItemId) throw new ValidationException('Stock item is required', [
      { field: 'stockItemId', message: 'Stock item is required', code: 'REQUIRED' },
    ])
    if (!body.reservedQuantity || body.reservedQuantity <= 0) throw new ValidationException('Quantity must be positive', [
      { field: 'reservedQuantity', message: 'Must be > 0', code: 'INVALID' },
    ])
    if (!body.expiresAt) throw new ValidationException('Expiry is required', [
      { field: 'expiresAt', message: 'Expiry is required', code: 'REQUIRED' },
    ])

    const stockItem = await db.stockItem.findFirst({
      where: { id: body.stockItemId, tenantId, deletedAt: null },
    })
    if (!stockItem) throw new NotFoundException('StockItem', body.stockItemId)

    // Check available quantity (derived from ledger — LAW-05)
    const ledgerSum = await db.inventoryTransaction.aggregate({
      where: { stockItemId: stockItem.id },
      _sum: { quantity: true },
    })
    const onHand = ledgerSum._sum.quantity ?? 0
    const available = onHand - stockItem.reservedQuantity

    if (body.reservedQuantity > available) {
      throw new BusinessException(
        `Insufficient available stock: requested ${body.reservedQuantity}, available ${available}`,
        'STOCK_INSUFFICIENT',
        422,
      )
    }

    // Generate business code
    const reservationNumber = await BusinessCodeGenerator.generate('stock_reservation', tenantId)

    // Create reservation + increment reservedQuantity on stock item
    const reservation = await db.$transaction(async (tx) => {
      const r = await tx.stockReservation.create({
        data: {
          tenantId,
          reservationNumber,
          stockItemId: body.stockItemId,
          productId: stockItem.productId,
          productInstanceId: stockItem.productInstanceId ?? body.productInstanceId,
          warehouseId: stockItem.warehouseId,
          reservedQuantity: body.reservedQuantity,
          reservationType: body.reservationType ?? 'manual',
          referenceType: body.referenceType ?? null,
          referenceId: body.referenceId ?? null,
          reservedBy: body.reservedBy ?? null,
          reservedForPartyId: body.reservedForPartyId ?? null,
          expiresAt: new Date(body.expiresAt),
          status: 'active',
          metadata: {},
        },
      })

      // Increment reserved on stock item
      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { reservedQuantity: { increment: body.reservedQuantity } },
      })

      return r
    })

    return jsonResponse({ data: toDTO(reservation) }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create reservation', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    reservationNumber: r.reservationNumber,
    stockItemId: r.stockItemId,
    productId: r.productId,
    productInstanceId: r.productInstanceId,
    warehouseId: r.warehouseId,
    reservedQuantity: r.reservedQuantity,
    reservationType: r.reservationType,
    referenceType: r.referenceType,
    referenceId: r.referenceId,
    reservedBy: r.reservedBy,
    reservedForPartyId: r.reservedForPartyId,
    reservedAt: r.reservedAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    releasedAt: r.releasedAt?.toISOString() ?? null,
    consumedAt: r.consumedAt?.toISOString() ?? null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
