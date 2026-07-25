import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/warranty-cards/{id}/activate
 * Activate warranty card — computes start/end dates from policy.
 * LAW-28: Normally triggered by 'shipment.delivered' event (async).
 * This endpoint allows manual activation for edge cases (admin override).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const card = await db.warrantyCard.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { warrantyPolicy: true },
    })
    if (!card) throw new NotFoundException('WarrantyCard', params.id)
    if (card.status !== 'pending') {
      throw new ValidationException('Warranty card must be pending to activate', [
        { field: 'status', message: `Current: ${card.status}`, code: 'INVALID_STATE' },
      ])
    }

    const now = new Date()
    const startDate = now
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + card.warrantyPolicy.warrantyMonths)
    const graceEndDate = new Date(endDate)
    graceEndDate.setDate(graceEndDate.getDate() + card.warrantyPolicy.graceDays)

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.warrantyCard.updateMany({
        where: { id: card.id, version: card.version },
        data: {
          status: 'active',
          activationDate: now,
          startDate, endDate, graceEndDate,
          version: { increment: 1 },
        },
      })

      // LAW-08: Outbox event (LAW-15: version 1.0)
      await uow.outbox.append({
        tenantId, aggregateType: 'WarrantyCard', aggregateId: card.id,
        eventType: 'warranty.activated', eventVersion: '1.0',
        payload: {
          warrantyNumber: card.warrantyNumber,
          productInstanceId: card.productInstanceId,
          customerPartyId: card.customerPartyId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        actorId: null,
      })
    })

    const response = jsonResponse({
      data: {
        id: card.id, warrantyNumber: card.warrantyNumber, status: 'active',
        startDate: startDate.toISOString(), endDate: endDate.toISOString(),
        message: 'Warranty activated. Event published for Device Timeline (LAW-30).',
      },
    })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to activate warranty', statusCode: 500 })
  }
}
