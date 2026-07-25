import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/invoices/{id}/cancel
 * Cancel invoice (only if unpaid — LAW-21).
 * Idempotent (LAW-06).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const invoice = await db.invoice.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Invoice', params.id)

    // LAW-21: Can only cancel if not yet paid
    if (invoice.paidAmount > 0) {
      throw new ValidationException('Cannot cancel invoice with payments — use Credit Note instead', [
        { field: 'paidAmount', message: `Already paid: ${invoice.paidAmount}`, code: 'HAS_PAYMENTS' },
      ])
    }
    if (invoice.status === 'cancelled' || invoice.status === 'reversed') {
      throw new ValidationException('Invoice already cancelled or reversed', [
        { field: 'status', message: `Current: ${invoice.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.invoice.updateMany({
        where: { id: invoice.id, version: invoice.version },
        data: { status: 'cancelled', cancelledAt: new Date(), version: { increment: 1 } },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'Invoice', aggregateId: invoice.id,
        eventType: 'invoice.cancelled', eventVersion: '1.0',
        payload: { invoiceNumber: invoice.invoiceNumber, reason: body.reason ?? null },
        actorId: null,
      })
    })

    const response = jsonResponse({ data: { id: invoice.id, status: 'cancelled' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to cancel invoice', statusCode: 500 })
  }
}
