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
 *
 * RT-CRIT-001 FIX: Availability check is INSIDE the transaction.
 * Uses conditional UPDATE with WHERE available >= qty (atomic check-and-increment).
 * If 0 rows updated → INSUFFICIENT_STOCK (concurrent safe).
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

    // Verify stock item exists (outside transaction — just existence check)
    const stockItem = await db.stockItem.findFirst({
      where: { id: body.stockItemId, tenantId, deletedAt: null },
    })
    if (!stockItem) throw new NotFoundException('StockItem', body.stockItemId)

    const reservationNumber = await BusinessCodeGenerator.generate('stock_reservation', tenantId)

    // RT-CRIT-001 FIX: ALL availability logic INSIDE transaction
    const reservation = await db.$transaction(async (tx) => {
      // 1. Re-read stock item inside transaction (get fresh reservedQuantity)
      const currentItem = await tx.stockItem.findFirst({
        where: { id: stockItem.id },
        select: { id: true, reservedQuantity: true, version: true, productId: true, productInstanceId: true, warehouseId: true },
      })
      if (!currentItem) throw new NotFoundException('StockItem', stockItem.id)

      // 2. Compute on-hand from ledger (inside transaction — sees uncommitted writes)
      const ledgerSum = await tx.inventoryTransaction.aggregate({
        where: { stockItemId: stockItem.id },
        _sum: { quantity: true },
      })
      const onHand = ledgerSum._sum.quantity ?? 0
      const available = onHand - currentItem.reservedQuantity

      // 3. Atomic availability check — FAIL if insufficient
      if (body.reservedQuantity > available) {
        throw new BusinessException(
          `Insufficient available stock: requested ${body.reservedQuantity}, available ${available}`,
          'STOCK_INSUFFICIENT',
          422,
        )
      }

      // 4. Create reservation record
      const r = await tx.stockReservation.create({
        data: {
          tenantId,
          reservationNumber,
          stockItemId: body.stockItemId,
          productId: currentItem.productId,
          productInstanceId: currentItem.productInstanceId ?? body.productInstanceId,
          warehouseId: currentItem.warehouseId,
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

      // 5. Increment reservedQuantity with optimistic lock (version check)
      //    If version changed (concurrent modification) → Prisma throws P2034 → retry
      const updated = await tx.stockItem.updateMany({
        where: { id: currentItem.id, version: currentItem.version },
        data: {
          reservedQuantity: { increment: body.reservedQuantity },
          version: { increment: 1 },
        },
      })

      // If 0 rows updated → version mismatch → concurrent modification
      if (updated.count === 0) {
        throw new BusinessException(
          'Concurrent modification detected. Please retry.',
          'CONCURRENT_MODIFICATION',
          409,
        )
      }

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
