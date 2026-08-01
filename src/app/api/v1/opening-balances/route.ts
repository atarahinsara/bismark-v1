import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * POST /api/v1/opening-balances
 * Create opening balance Journal Entry.
 *
 * Body:
 *   lines: [{ accountId, debitAmount, creditAmount }]
 *   entryDate: string
 *
 * LAW-35: Must balance.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
      throw new ValidationException('At least 2 lines required', [{ field: 'lines', message: 'Min 2', code: 'MIN_LINES' }])
    }

    let totalDebit = 0
    let totalCredit = 0
    for (const line of body.lines) {
      totalDebit += line.debitAmount ?? 0
      totalCredit += line.creditAmount ?? 0
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BusinessException(`Opening balance not balanced (LAW-35): debit=${totalDebit}, credit=${totalCredit}`, 'UNBALANCED_ENTRY', 422)
    }

    const entryNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)
    const entryDate = body.entryDate ? new Date(body.entryDate) : new Date()

    await UnitOfWork.execute(async (uow) => {
      const entry = await uow.tx.journalEntry.create({
        data: {
          tenantId, entryNumber, entryDate,
          description: 'Opening Balance Entry',
          sourceType: 'opening_balance',
          status: 'posted', postedAt: new Date(), postedBy: body.postedBy ?? 'admin',
          totalDebit, totalCredit,
          metadata: { isOpening: true },
        },
      })

      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i]
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId, journalEntryId: entry.id, lineNumber: i + 1,
            accountId: line.accountId,
            debitAmount: line.debitAmount ?? 0,
            creditAmount: line.creditAmount ?? 0,
            description: 'Opening Balance',
          },
        })
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: entry.id,
        eventType: 'opening_balance.created', eventVersion: '1.0',
        payload: { entryNumber, totalDebit, totalCredit },
        actorId: body.postedBy ?? null,
      })
    })

    const responseBody = JSON.stringify({ data: { entryNumber, status: 'posted', message: 'Opening balance JE created and posted (LAW-35: balanced).' } })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create opening balance', statusCode: 500 })
  }
}