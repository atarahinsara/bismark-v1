import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/invoices/{id}/credit-note
 * Create a credit note for this invoice (LAW-14/21: reversal instead of edit).
 * Idempotent (LAW-06).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    const invoice = await db.invoice.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!invoice) throw new NotFoundException('Invoice', params.id)

    // LAW-21: Invoice must be issued to create credit note
    if (invoice.status === 'draft' || invoice.status === 'cancelled') {
      throw new ValidationException('Invoice must be issued to create credit note', [
        { field: 'status', message: `Current: ${invoice.status}`, code: 'INVALID_STATE' },
      ])
    }

    const creditNoteNumber = await BusinessCodeGenerator.generate('credit_note', tenantId)
    const creditAmount = body.amount ?? invoice.totalAmount

    const creditNote = await UnitOfWork.execute(async (uow) => {
      const cn = await uow.tx.creditNote.create({
        data: {
          tenantId,
          creditNoteNumber,
          invoiceId: invoice.id,
          customerPartyId: invoice.customerPartyId,
          status: 'issued',
          subtotal: creditAmount,
          totalAmount: creditAmount,
          currencyCode: invoice.currencyCode,
          reason: body.reason ?? 'Credit note',
          notes: body.notes ?? null,
          issuedAt: new Date(),
          metadata: {},
        },
      })

      // Reverse the invoice: mark as reversed + reduce paidAmount
      await uow.tx.invoice.updateMany({
        where: { id: invoice.id, version: invoice.version },
        data: {
          status: 'reversed',
          reversedAt: new Date(),
          paidAmount: { decrement: creditAmount },
          version: { increment: 1 },
        },
      })

      // LAW-19: Outbox event — Financial will create reversal Journal Entry
      await uow.outbox.append({
        tenantId, aggregateType: 'CreditNote', aggregateId: cn.id,
        eventType: 'credit_note.issued', eventVersion: '1.0',
        payload: {
          creditNoteNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerPartyId: invoice.customerPartyId,
          totalAmount: creditAmount,
          currencyCode: invoice.currencyCode,
        },
        actorId: null,
      })

      return cn
    })

    const response = jsonResponse({
      data: {
        id: creditNote.id,
        creditNoteNumber: creditNote.creditNoteNumber,
        invoiceId: invoice.id,
        status: 'issued',
        totalAmount: creditAmount,
        message: 'Credit note issued. Invoice reversed (LAW-21). Financial will process reversal (LAW-19).',
      },
    }, 201)

    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create credit note', statusCode: 500 })
  }
}
