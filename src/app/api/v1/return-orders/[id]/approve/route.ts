import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/return-orders/{id}/approve
 * Approve return — creates Credit Note automatically (LAW-23).
 * Publishes event for Financial (LAW-19).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'return.approve')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const ret = await db.returnOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!ret) throw new NotFoundException('ReturnOrder', params.id)
    if (ret.status !== 'draft' && ret.status !== 'submitted') {
      throw new ValidationException('Return must be draft or submitted to approve', [
        { field: 'status', message: `Current: ${ret.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.returnOrder.updateMany({
        where: { id: ret.id, version: ret.version },
        data: { status: 'approved', approvedAt: new Date(), approvedBy: body.approvedBy ?? null, version: { increment: 1 } },
      })

      // LAW-23: Auto-create Credit Note if invoice exists
      if (ret.invoiceId) {
        const invoice = await uow.tx.invoice.findFirst({ where: { id: ret.invoiceId, tenantId } })
        if (invoice) {
          const cnNumber = await BusinessCodeGenerator.generate('credit_note', tenantId)
          await uow.tx.creditNote.create({
            data: {
              tenantId, creditNoteNumber: cnNumber, invoiceId: invoice.id,
              customerPartyId: ret.customerPartyId, status: 'issued',
              subtotal: ret.refundAmount, totalAmount: ret.refundAmount,
              currencyCode: ret.currencyCode, reason: `Return ${ret.returnNumber}`,
              issuedAt: new Date(), metadata: { returnOrderId: ret.id },
            },
          })

          // LAW-19: Outbox event — Financial creates reversal JE
          await uow.outbox.append({
            tenantId, aggregateType: 'CreditNote', aggregateId: ret.id,
            eventType: 'credit_note.issued', eventVersion: '1.0',
            payload: { creditNoteNumber: cnNumber, invoiceId: invoice.id, returnOrderId: ret.id, totalAmount: ret.refundAmount },
            actorId: body.approvedBy ?? null,
          })
        }
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'ReturnOrder', aggregateId: ret.id,
        eventType: 'return_order.approved', eventVersion: '1.0',
        payload: { returnNumber: ret.returnNumber, refundAmount: ret.refundAmount },
        actorId: body.approvedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: ret.id, returnNumber: ret.returnNumber, status: 'approved', message: 'Return approved. Credit Note created (LAW-23). Financial will process reversal (LAW-19).' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to approve return', statusCode: 500 })
  }
}
