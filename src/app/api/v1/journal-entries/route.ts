import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * GET /api/v1/journal-entries
 * List journal entries (LAW-34: read-only for non-Financial contexts).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const sourceType = url.searchParams.get('source_type')

    const where = {
      tenantId, deletedAt: null,
      ...(status ? { status } : {}),
      ...(sourceType ? { sourceType } : {}),
    }

    const [entries, total] = await Promise.all([
      db.journalEntry.findMany({
        where, include: { _count: { select: { lines: true } } },
        orderBy: { entryDate: 'desc' },
        skip: (params.page - 1) * params.perPage, take: params.perPage,
      }),
      db.journalEntry.count({ where }),
    ])

    return jsonResponse({
      data: entries.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list journal entries', statusCode: 500 })
  }
}

/**
 * POST /api/v1/journal-entries
 * Create a new Journal Entry (LAW-34: only Financial context).
 * LAW-35: Entry must balance (totalDebit === totalCredit).
 * LAW-36: Cannot post to closed fiscal period.
 *
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12).
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

    // Validation
    if (!body.entryDate) throw new ValidationException('Entry date is required', [{ field: 'entryDate', message: 'Required', code: 'REQUIRED' }])
    if (!body.description) throw new ValidationException('Description is required', [{ field: 'description', message: 'Required', code: 'REQUIRED' }])
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
      throw new ValidationException('At least 2 lines required (double-entry)', [{ field: 'lines', message: 'Min 2 lines', code: 'MIN_LINES' }])
    }

    const entryDate = new Date(body.entryDate)

    // LAW-36: Check fiscal period is not closed
    const fiscalPeriod = await db.fiscalPeriod.findFirst({
      where: {
        tenantId,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
    })

    if (fiscalPeriod && fiscalPeriod.status === 'closed') {
      throw new BusinessException(
        `Fiscal period ${fiscalPeriod.periodCode} is closed (LAW-36)`,
        'FISCAL_PERIOD_CLOSED', 422,
      )
    }

    // LAW-35: Calculate and validate balance
    let totalDebit = 0
    let totalCredit = 0

    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i]
      const debit = line.debitAmount ?? 0
      const credit = line.creditAmount ?? 0

      // Each line: debit XOR credit
      if (debit > 0 && credit > 0) {
        throw new ValidationException(`Line ${i + 1}: cannot have both debit and credit`, [
          { field: `lines[${i}].debitAmount`, message: 'Debit XOR credit', code: 'BOTH_DEBIT_CREDIT' },
        ])
      }
      if (debit === 0 && credit === 0) {
        throw new ValidationException(`Line ${i + 1}: must have debit or credit`, [
          { field: `lines[${i}].debitAmount`, message: 'Required', code: 'ZERO_AMOUNT' },
        ])
      }

      totalDebit += debit
      totalCredit += credit
    }

    // LAW-35: Must balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BusinessException(
        `Journal entry not balanced: debit=${totalDebit}, credit=${totalCredit} (LAW-35)`,
        'UNBALANCED_ENTRY', 422,
      )
    }

    const entryNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)

    // LAW-11/12: Application Service + Unit of Work
    const entry = await UnitOfWork.execute(async (uow) => {
      // Verify all accounts exist and are postable
      for (const line of body.lines) {
        const account = await uow.tx.chartOfAccount.findFirst({
          where: { id: line.accountId, tenantId, isActive: true, deletedAt: null },
        })
        if (!account) throw new NotFoundException('ChartOfAccount', line.accountId)
        if (!account.isPostable) {
          throw new ValidationException(`Account ${account.accountCode} is not postable (header account)`, [
            { field: 'accountId', message: 'Header account not postable', code: 'NOT_POSTABLE' },
          ])
        }
      }

      // Create Journal Entry
      const newEntry = await uow.tx.journalEntry.create({
        data: {
          tenantId, entryNumber, entryDate,
          fiscalPeriodId: fiscalPeriod?.id ?? null,
          description: body.description,
          sourceType: body.sourceType ?? 'manual',
          sourceId: body.sourceId ?? null,
          status: body.autoPost ? 'posted' : 'draft',
          totalDebit, totalCredit,
          postedAt: body.autoPost ? new Date() : null,
          postedBy: body.autoPost ? (body.postedBy ?? 'system') : null,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      // Create lines
      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i]
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId, journalEntryId: newEntry.id, lineNumber: i + 1,
            accountId: line.accountId,
            costCenterId: line.costCenterId ?? null,
            partyId: line.partyId ?? null,
            debitAmount: line.debitAmount ?? 0,
            creditAmount: line.creditAmount ?? 0,
            description: line.description ?? null,
          },
        })
      }

      // Outbox event (LAW-08, LAW-15)
      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: newEntry.id,
        eventType: 'journal_entry.created', eventVersion: '1.0',
        payload: { entryNumber, totalDebit, totalCredit, description: body.description, sourceType: body.sourceType ?? 'manual' },
        actorId: body.postedBy ?? null,
      })

      return newEntry
    })

    const result = await db.journalEntry.findUnique({
      where: { id: entry.id },
      include: { _count: { select: { lines: true } } },
    })

    const responseBody = JSON.stringify({ data: toDTO(result) })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create journal entry', statusCode: 500 })
  }
}

function toDTO(e: any) {
  const isBalanced = Math.abs(e.totalDebit - e.totalCredit) < 0.01 // LAW-35: computed
  return {
    id: e.id, entryNumber: e.entryNumber,
    entryDate: e.entryDate.toISOString(),
    fiscalPeriodId: e.fiscalPeriodId,
    description: e.description,
    sourceType: e.sourceType, sourceId: e.sourceId,
    status: e.status,
    totalDebit: e.totalDebit, totalCredit: e.totalCredit,
    isBalanced, // computed — LAW-05
    reversedById: e.reversedById,
    postedAt: e.postedAt?.toISOString() ?? null,
    version: e.version,
    lineCount: e._count?.lines ?? 0,
    createdAt: e.createdAt.toISOString(),
  }
}