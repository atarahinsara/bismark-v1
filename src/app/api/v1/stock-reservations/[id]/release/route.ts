import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/stock-reservations/{id}/release
 * Release a reservation (frees up reserved quantity).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const reservation = await db.stockReservation.findFirst({
      where: { id: params.id, tenantId },
    })
    if (!reservation) throw new NotFoundException('StockReservation', params.id)
    if (reservation.status !== 'active') {
      throw new ValidationException('Reservation is not active', [
        { field: 'status', message: `Current status: ${reservation.status}`, code: 'INVALID_STATE' },
      ])
    }

    await db.$transaction(async (tx) => {
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'released',
          releasedAt: new Date(),
          releasedBy: body.releasedBy ?? null,
          releaseReason: body.reason ?? null,
        },
      })

      await tx.stockItem.update({
        where: { id: reservation.stockItemId },
        data: { reservedQuantity: { decrement: reservation.reservedQuantity } },
      })
    })

    return jsonResponse({ data: { id: reservation.id, status: 'released' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to release reservation', statusCode: 500 })
  }
}
