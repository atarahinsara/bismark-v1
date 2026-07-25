import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/general-ledger
 * General Ledger view — all posted JE lines with running balance.
 * LAW-05: Derived from ledger (not stored).
 *
 * Filters: accountId, fiscalPeriodId, costCenterId, fromDate, toDate
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const accountId = url.searchParams.get('account_id')
    const fiscalPeriodId = url.searchParams.get('fiscal_period_id')
    const costCenterId = url.searchParams.get('cost_center_id')
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')

    const where = {
      tenantId,
      journalEntry: {
        status: 'posted',
        deletedAt: null,
        ...(fiscalPeriodId ? { fiscalPeriodId } : {}),
        ...(fromDate || toDate ? {
          entryDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        } : {}),
      },
      ...(accountId ? { accountId } : {}),
      ...(costCenterId ? { costCenterId } : {}),
    }

    const lines = await db.journalEntryLine.findMany({
      where,
      include: {
        account: true,
        journalEntry: { select: { entryNumber: true, entryDate: true, description: true, sourceType: true } },
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    })

    // Calculate running balance
    let runningBalance = 0
    const ledger = lines.map((l) => {
      const debit = l.debitAmount
      const credit = l.creditAmount
      // For asset/expense: debit increases, credit decreases
      // For liability/equity/revenue: credit increases, debit decreases
      const accountType = l.account.accountType
      const isDebitNormal = accountType === 'asset' || accountType === 'expense'
      runningBalance += isDebitNormal ? (debit - credit) : (credit - debit)

      return {
        lineId: l.id,
        entryNumber: l.journalEntry.entryNumber,
        entryDate: l.journalEntry.entryDate.toISOString(),
        description: l.journalEntry.description,
        accountCode: l.account.accountCode,
        accountName: l.account.accountName,
        accountType: l.account.accountType,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance,
        sourceType: l.journalEntry.sourceType,
        costCenterId: l.costCenterId,
        partyId: l.partyId,
      }
    })

    // Summary
    const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0)
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0)

    return jsonResponse({
      data: {
        lines: ledger,
        summary: {
          lineCount: lines.length,
          totalDebit,
          totalCredit,
          finalBalance: runningBalance,
        },
        filters: { accountId, fiscalPeriodId, costCenterId, fromDate, toDate },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate general ledger', statusCode: 500 })
  }
}
