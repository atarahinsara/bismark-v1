import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reports/equity?fromDate=...&toDate=...
 * Statement of Changes in Equity (LAW-46/47/48).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.reports')

    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('fromDate') ? new Date(url.searchParams.get('fromDate')!) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = url.searchParams.get('toDate') ? new Date(url.searchParams.get('toDate')!) : new Date()

    // Opening equity (all posted JEs before fromDate)
    const openingLines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { lt: fromDate } }, account: { accountType: 'equity' } },
    })
    const openingEquity = openingLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0)

    // Period movements
    const periodLines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: fromDate, lte: toDate } }, account: { accountType: 'equity' } },
      include: { account: true },
    })

    let contributions = 0, withdrawals = 0
    const items: any[] = []
    for (const line of periodLines) {
      const net = line.creditAmount - line.debitAmount
      if (net > 0) contributions += net
      else withdrawals += Math.abs(net)
      items.push({ account: line.account.accountName, debit: line.debitAmount, credit: line.creditAmount, net })
    }

    // Profit for the period
    const revLines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: fromDate, lte: toDate } }, account: { accountType: 'revenue' } },
    })
    const expLines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: fromDate, lte: toDate } }, account: { accountType: 'expense' } },
    })
    const profit = revLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0) - expLines.reduce((s, l) => s + l.debitAmount - l.creditAmount, 0)

    const closingEquity = openingEquity + profit + contributions - withdrawals

    return jsonResponse({
      data: {
        reportType: 'equity',
        period: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() },
        openingEquity,
        profit,
        ownerContributions: contributions,
        withdrawals,
        closingEquity,
        items,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate equity statement', statusCode: 500 })
  }
}
