import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reports/final-trial-balance?asOfDate=...&fromDate=...
 * Final Trial Balance with Opening, Movements, Closing (LAW-46/47/48).
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const asOfDate = url.searchParams.get('asOfDate') ? new Date(url.searchParams.get('asOfDate')!) : new Date()
    const fromDate = url.searchParams.get('fromDate') ? new Date(url.searchParams.get('fromDate')!) : new Date(new Date().getFullYear(), 0, 1)

    // Opening balances (all posted JEs before fromDate)
    const openingLines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { lt: fromDate } }, journalEntry: { entryDate: { lt: fromDate } } },
      include: { account: true },
    })

    // Movement (fromDate to asOfDate)
    const movementLines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: fromDate, lte: asOfDate } } },
      include: { account: true },
    })

    // Build account map
    const accountMap = new Map<string, { code: string; name: string; type: string; openingDebit: number; openingCredit: number; moveDebit: number; moveCredit: number }>()

    for (const line of openingLines) {
      const key = line.accountId
      if (!accountMap.has(key)) accountMap.set(key, { code: line.account.accountCode, name: line.account.accountName, type: line.account.accountType, openingDebit: 0, openingCredit: 0, moveDebit: 0, moveCredit: 0 })
      accountMap.get(key)!.openingDebit += line.debitAmount
      accountMap.get(key)!.openingCredit += line.creditAmount
    }

    for (const line of movementLines) {
      const key = line.accountId
      if (!accountMap.has(key)) accountMap.set(key, { code: line.account.accountCode, name: line.account.accountName, type: line.account.accountType, openingDebit: 0, openingCredit: 0, moveDebit: 0, moveCredit: 0 })
      accountMap.get(key)!.moveDebit += line.debitAmount
      accountMap.get(key)!.moveCredit += line.creditAmount
    }

    const accounts = Array.from(accountMap.values()).map(a => {
      const closingDebit = a.openingDebit + a.moveDebit
      const closingCredit = a.openingCredit + a.moveCredit
      return { ...a, closingDebit, closingCredit }
    }).sort((a, b) => a.code.localeCompare(b.code))

    const totals = {
      openingDebit: accounts.reduce((s, a) => s + a.openingDebit, 0),
      openingCredit: accounts.reduce((s, a) => s + a.openingCredit, 0),
      movementDebit: accounts.reduce((s, a) => s + a.moveDebit, 0),
      movementCredit: accounts.reduce((s, a) => s + a.moveCredit, 0),
      closingDebit: accounts.reduce((s, a) => s + a.closingDebit, 0),
      closingCredit: accounts.reduce((s, a) => s + a.closingCredit, 0),
    }

    return jsonResponse({
      data: {
        reportType: 'final_trial_balance',
        period: { fromDate: fromDate.toISOString(), asOfDate: asOfDate.toISOString() },
        accounts,
        totals: {
          ...totals,
          openingDifference: Math.abs(totals.openingDebit - totals.openingCredit),
          movementDifference: Math.abs(totals.movementDebit - totals.movementCredit),
          closingDifference: Math.abs(totals.closingDebit - totals.closingCredit),
          isBalanced: Math.abs(totals.closingDebit - totals.closingCredit) < 0.01,
        },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate trial balance', statusCode: 500 })
  }
}
