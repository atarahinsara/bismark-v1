import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/journal-entries/{id}
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const tenantId = await getTenantId()
    const entry = await db.journalEntry.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: { orderBy: { lineNumber: 'asc' }, include: { account: true } } },
    })
    if (!entry) throw new NotFoundException('JournalEntry', params.id)

    const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01
    return jsonResponse({
      data: {
        id: entry.id, entryNumber: entry.entryNumber,
        entryDate: entry.entryDate.toISOString(),
        description: entry.description, status: entry.status,
        totalDebit: entry.totalDebit, totalCredit: entry.totalCredit,
        isBalanced, sourceType: entry.sourceType, sourceId: entry.sourceId,
        postedAt: entry.postedAt?.toISOString() ?? null, version: entry.version,
      },
      lines: entry.lines.map(l => ({
        id: l.id, lineNumber: l.lineNumber,
        accountId: l.accountId, accountCode: l.account?.accountCode, accountName: l.account?.accountName,
        costCenterId: l.costCenterId, partyId: l.partyId,
        debitAmount: l.debitAmount, creditAmount: l.creditAmount,
        description: l.description,
      })),
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch journal entry', statusCode: 500 })
  }
}

/**
 * POST /api/v1/journal-entries/{id}/post
 * Post a draft journal entry (draft → posted).
 * LAW-35: Verify balance before posting.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const entry = await db.journalEntry.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!entry) throw new NotFoundException('JournalEntry', params.id)
    if (entry.status !== 'draft') {
      throw new ValidationException('Entry must be draft to post', [{ field: 'status', message: `Current: ${entry.status}`, code: 'INVALID_STATE' }])
    }

    // LAW-35: Verify balance
    if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
      throw new BusinessException(
        `Entry not balanced: debit=${entry.totalDebit}, credit=${entry.totalCredit} (LAW-35)`,
        'UNBALANCED_ENTRY', 422,
      )
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.journalEntry.updateMany({
        where: { id: entry.id, version: entry.version },
        data: { status: 'posted', postedAt: new Date(), postedBy: body.postedBy ?? 'system', version: { increment: 1 } },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: entry.id,
        eventType: 'journal_entry.posted', eventVersion: '1.0',
        payload: { entryNumber: entry.entryNumber, totalDebit: entry.totalDebit, totalCredit: entry.totalCredit },
        actorId: body.postedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: entry.id, entryNumber: entry.entryNumber, status: 'posted', message: 'Journal entry posted to General Ledger.' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to post journal entry', statusCode: 500 })
  }
}
