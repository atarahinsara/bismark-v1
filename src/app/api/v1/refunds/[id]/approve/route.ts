import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/refunds/{id}/approve
 * Approve refund — publishes event for Financial (LAW-19).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const refund = await db.refund.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!refund) throw new NotFoundException('Refund', params.id)
    if (refund.status !== 'pending') {
      throw new ValidationException('Refund must be pending to approve', [
        { field: 'status', message: `Current: ${refund.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.refund.updateMany({
        where: { id: refund.id, version: refund.version },
        data: { status: 'completed', approvedAt: new Date(), approvedBy: body.approvedBy ?? null, completedAt: new Date(), version: { increment: 1 } },
      })

      // LAW-19: Outbox event — Financial creates refund Journal Entry
      await uow.outbox.append({
        tenantId, aggregateType: 'Refund', aggregateId: refund.id,
        eventType: 'refund.completed', eventVersion: '1.0',
        payload: {
          refundNumber: refund.refundNumber, amount: refund.amount,
          currencyCode: refund.currencyCode, customerPartyId: refund.customerPartyId,
          refundMethod: refund.refundMethod,
        },
        actorId: body.approvedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: { id: refund.id, refundNumber: refund.refundNumber, status: 'completed', message: 'Refund completed. Financial will create Journal Entry (LAW-19).' },
    })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to approve refund', statusCode: 500 })
  }
}
