import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/invoices/{id}/issue
 * Issue invoice — transitions draft → issued.
 * LAW-21: Invoice becomes immutable after this.
 * LAW-19: Does NOT create Journal Entry — Financial consumes event.
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'invoice.issue')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const invoice = await db.invoice.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Invoice', params.id)
    if (invoice.status !== 'draft') {
      throw new ValidationException('Invoice must be draft to issue', [
        { field: 'status', message: `Current: ${invoice.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.invoice.updateMany({
        where: { id: invoice.id, version: invoice.version },
        data: {
          status: 'issued',
          issuedAt: new Date(),
          taxInvoiceNumber: body.taxInvoiceNumber ?? null,
          version: { increment: 1 },
        },
      })

      // LAW-19: NO Journal Entry here — Financial will consume this event
      // LAW-08: Outbox event (Financial listens to create AR Invoice + JE)
      await uow.outbox.append({
        tenantId, aggregateType: 'Invoice', aggregateId: invoice.id,
        eventType: 'invoice.issued', eventVersion: '1.0',
        payload: {
          invoiceNumber: invoice.invoiceNumber,
          customerPartyId: invoice.customerPartyId,
          totalAmount: invoice.totalAmount,
          currencyCode: invoice.currencyCode,
        },
        actorId: body.issuedBy ?? null,
      })
    })

    await auditLog.record({
      tenantId, userId: ctx.userId, action: 'issue', entityType: 'Invoice',
      entityId: invoice.id, entityCode: invoice.invoiceNumber,
      changes: { before: { status: 'draft' }, after: { status: 'issued' } },
      correlationId: invoice.id, sessionId: ctx.sessionId,
    }).catch(() => {})
    const response = jsonResponse({
      data: {
        id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: 'issued',
        message: 'Invoice issued. Financial will create accounting entries via event (LAW-19).',
      },
    })

    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to issue invoice', statusCode: 500 })
  }
}
