import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reports/cash-flow?fromDate=...&toDate=...
 * LAW-46/47/48: Derived from posted JEs, reproducible, read-only.
 *
 * Categories:
 *   Operating: Revenue/Expense related cash movements
 *   Investing: Asset purchases/sales
 *   Financing: Equity/debt movements
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('fromDate') ? new Date(url.searchParams.get('fromDate')!) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = url.searchParams.get('toDate') ? new Date(url.searchParams.get('toDate')!) : new Date()

    const lines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: fromDate, lte: toDate } } },
      include: { account: true },
    })

    let operating = 0, investing = 0, financing = 0
    const operatingItems: any[] = [], investingItems: any[] = [], financingItems: any[] = []

    for (const line of lines) {
      const type = line.account.accountType
      const code = line.account.accountCode
      const net = line.debitAmount - line.creditAmount

      // Cash accounts (1000-1999 range typically)
      const isCashAccount = code.includes('CASH') || code.includes('1000') || code.startsWith('1')
      
      if (isCashAccount) {
        // This is a cash movement — categorize by the other side of the entry
        // Simplified: categorize by account type of the counterpart
        if (type === 'revenue' || type === 'expense') {
          operating += -net // cash increases when revenue (credit), decreases when expense (debit)
          operatingItems.push({ account: line.account.accountName, amount: -net })
        } else if (type === 'asset' && !isCashAccount) {
          investing += -net
          investingItems.push({ account: line.account.accountName, amount: -net })
        } else if (type === 'liability' || type === 'equity') {
          financing += -net
          financingItems.push({ account: line.account.accountName, amount: -net })
        }
      }
    }

    const netChange = operating + investing + financing

    return jsonResponse({
      data: {
        reportType: 'cash_flow',
        period: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() },
        operating: { items: operatingItems, total: operating },
        investing: { items: investingItems, total: investing },
        financing: { items: financingItems, total: financing },
        netChange,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate cash flow', statusCode: 500 })
  }
}
