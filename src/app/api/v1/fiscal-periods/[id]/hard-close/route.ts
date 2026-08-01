import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/fiscal-periods/{id}/hard-close
 * LAW-38: Hard close requires zero validation errors.
 * After hard close, the period is immutable (LAW-36).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.period_close')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const period = await db.fiscalPeriod.findFirst({ where: { id: params.id, tenantId } })
    if (!period) throw new NotFoundException('FiscalPeriod', params.id)
    if (period.status !== 'open' && period.status !== 'temporarily_closed') {
      throw new ValidationException('Period must be open or temporarily_closed', [{ field: 'status', message: `Current: ${period.status}`, code: 'INVALID_STATE' }])
    }

    // LAW-38: Run closing validations
    const periodEntries = await db.journalEntry.findMany({
      where: { tenantId, fiscalPeriodId: params.id, status: 'posted', deletedAt: null },
      select: { totalDebit: true, totalCredit: true },
    })
    const totalDebit = periodEntries.reduce((s, e) => s + e.totalDebit, 0)
    const totalCredit = periodEntries.reduce((s, e) => s + e.totalCredit, 0)
    const tbDiff = Math.abs(totalDebit - totalCredit)
    if (tbDiff > 0.01) {
      throw new BusinessException(`Trial Balance not balanced: diff=${tbDiff} (LAW-38)`, 'CLOSING_VALIDATION_FAILED', 422)
    }

    const draftCount = await db.journalEntry.count({ where: { tenantId, fiscalPeriodId: params.id, status: 'draft', deletedAt: null } })
    if (draftCount > 0) {
      throw new BusinessException(`${draftCount} draft entries found (LAW-38)`, 'CLOSING_VALIDATION_FAILED', 422)
    }

    const pendingEvents = await db.outboxMessage.count({ where: { tenantId, status: 'pending', eventType: { startsWith: 'journal' } } })
    if (pendingEvents > 0) {
      throw new BusinessException(`${pendingEvents} pending financial events (LAW-38)`, 'CLOSING_VALIDATION_FAILED', 422)
    }

    // All validations passed — hard close
    await UnitOfWork.execute(async (uow) => {
      await uow.tx.fiscalPeriod.update({ where: { id: params.id }, data: { status: 'closed', closedAt: new Date(), closedBy: body.closedBy ?? 'admin' } })

      await uow.outbox.append({
        tenantId, aggregateType: 'FiscalPeriod', aggregateId: params.id,
        eventType: 'fiscal_period.closed', eventVersion: '1.0',
        payload: { periodCode: period.periodCode },
        actorId: body.closedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: { id: params.id, periodCode: period.periodCode, status: 'closed', message: 'Period hard-closed (LAW-36: immutable, LAW-38: all validations passed).' },
    })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to hard close', statusCode: 500 })
  }
}
