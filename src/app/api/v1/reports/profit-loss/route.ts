import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reports/profit-loss?fromDate=...&toDate=...
 * LAW-46: Derived from posted JEs only.
 * LAW-47: Reproducible for any historical period.
 * LAW-48: Read-only.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('fromDate') ? new Date(url.searchParams.get('fromDate')!) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = url.searchParams.get('toDate') ? new Date(url.searchParams.get('toDate')!) : new Date()
    const costCenterId = url.searchParams.get('cost_center_id')

    const lines = await db.journalEntryLine.findMany({
      where: {
        tenantId,
        ...(costCenterId ? { costCenterId } : {}),
        journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: fromDate, lte: toDate } },
      },
      include: { account: true },
    })

    // Group by account type
    let totalRevenue = 0, totalCOGS = 0, totalOpEx = 0, totalTax = 0
    const revenueAccounts: any[] = [], cogsAccounts: any[] = [], opExAccounts: any[] = [], taxAccounts: any[] = []
    const accountMap = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>()

    for (const line of lines) {
      const key = line.accountId
      if (!accountMap.has(key)) {
        accountMap.set(key, { code: line.account.accountCode, name: line.account.accountName, type: line.account.accountType, debit: 0, credit: 0 })
      }
      const acct = accountMap.get(key)!
      acct.debit += line.debitAmount
      acct.credit += line.creditAmount
    }

    for (const [, acct] of accountMap) {
      const balance = acct.type === 'revenue' ? acct.credit - acct.debit : acct.debit - acct.credit
      const entry = { ...acct, balance }
      if (acct.type === 'revenue') { revenueAccounts.push(entry); totalRevenue += balance }
      else if (acct.code.includes('COGS') || acct.code.includes('5000')) { cogsAccounts.push(entry); totalCOGS += balance }
      else if (acct.type === 'expense') {
        if (acct.code.includes('TAX') || acct.code.includes('6000')) { taxAccounts.push(entry); totalTax += balance }
        else { opExAccounts.push(entry); totalOpEx += balance }
      }
    }

    const grossProfit = totalRevenue - totalCOGS
    const operatingProfit = grossProfit - totalOpEx
    const netProfit = operatingProfit - totalTax

    return jsonResponse({
      data: {
        reportType: 'profit_loss',
        period: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() },
        revenue: { accounts: revenueAccounts.sort((a, b) => a.code.localeCompare(b.code)), total: totalRevenue },
        cogs: { accounts: cogsAccounts.sort((a, b) => a.code.localeCompare(b.code)), total: totalCOGS },
        grossProfit,
        operatingExpenses: { accounts: opExAccounts.sort((a, b) => a.code.localeCompare(b.code)), total: totalOpEx },
        operatingProfit,
        taxExpense: { accounts: taxAccounts.sort((a, b) => a.code.localeCompare(b.code)), total: totalTax },
        netProfit,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate P&L', statusCode: 500 })
  }
}
