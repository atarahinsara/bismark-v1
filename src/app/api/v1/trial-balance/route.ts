import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/trial-balance
 * Generate Trial Balance from posted Journal Entries.
 *
 * Trial Balance = SUM of all posted JE lines grouped by account.
 * Total debit should equal total credit (DoD: always zero difference).
 *
 * LAW-05: Derived from ledger (not stored).
 * LAW-34: Read-only (Financial context only).
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')

    // Get all posted journal entry lines
    const lines = await db.journalEntryLine.findMany({
      where: {
        tenantId,
        journalEntry: {
          status: 'posted',
          deletedAt: null,
          ...(fromDate || toDate ? {
            entryDate: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate) } : {}),
            },
          } : {}),
        },
      },
      include: { account: true },
    })

    // Group by account
    const accountMap = new Map<string, {
      accountCode: string
      accountName: string
      accountType: string
      totalDebit: number
      totalCredit: number
    }>()

    for (const line of lines) {
      const key = line.accountId
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountCode: line.account.accountCode,
          accountName: line.account.accountName,
          accountType: line.account.accountType,
          totalDebit: 0,
          totalCredit: 0,
        })
      }
      const acct = accountMap.get(key)!
      acct.totalDebit += line.debitAmount
      acct.totalCredit += line.creditAmount
    }

    // Build trial balance
    const accounts = Array.from(accountMap.values()).map(a => ({
      ...a,
      balance: a.totalDebit - a.totalCredit, // positive = debit balance, negative = credit balance
    }))

    const grandTotalDebit = accounts.reduce((sum, a) => sum + a.totalDebit, 0)
    const grandTotalCredit = accounts.reduce((sum, a) => sum + a.totalCredit, 0)
    const difference = Math.abs(grandTotalDebit - grandTotalCredit)

    return jsonResponse({
      data: {
        accounts: accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
        summary: {
          totalDebit: grandTotalDebit,
          totalCredit: grandTotalCredit,
          difference, // DoD: should always be 0 (LAW-35)
          isBalanced: difference < 0.01,
          accountCount: accounts.length,
        },
        filter: {
          from_date: fromDate,
          to_date: toDate,
        },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate trial balance', statusCode: 500 })
  }
}
