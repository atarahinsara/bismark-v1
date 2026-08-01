import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reports/dashboard
 * Financial Dashboard with KPIs (LAW-46/47/48: read-only, derived from posted JEs).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.reports')

    const tenantId = await getTenantId()
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // All posted JE lines this year
    const lines = await db.journalEntryLine.findMany({
      where: { tenantId, journalEntry: { status: 'posted', deletedAt: null, entryDate: { gte: yearStart, lte: now } } },
      include: { account: true },
    })

    let revenue = 0, expense = 0, cash = 0, ar = 0, ap = 0, inventory = 0
    for (const line of lines) {
      const type = line.account.accountType
      const code = line.account.accountCode
      if (type === 'revenue') revenue += line.creditAmount - line.debitAmount
      else if (type === 'expense') expense += line.debitAmount - line.creditAmount
      else if (type === 'asset') {
        if (code.includes('CASH') || code.includes('1000')) cash += line.debitAmount - line.creditAmount
        if (code.includes('AR') || line.account.isControlAccount) ar += line.debitAmount - line.creditAmount
        if (code.includes('INV') || code.includes('1400')) inventory += line.debitAmount - line.creditAmount
      }
      else if (type === 'liability' && (code.includes('AP') || line.account.isControlAccount)) {
        ap += line.creditAmount - line.debitAmount
      }
    }

    const profit = revenue - expense
    const grossMargin = revenue > 0 ? (profit / revenue) * 100 : 0
    const currentRatio = (cash + ar + inventory) / (ap || 1)
    const quickRatio = (cash + ar) / (ap || 1)
    const workingCapital = (cash + ar + inventory) - ap

    // Monthly trends
    const monthlyData: Record<string, { revenue: number; expense: number }> = {}
    for (const line of lines) {
      const monthKey = line.journalEntry?.entryDate ? new Date(line.journalEntry.entryDate).toISOString().slice(0, 7) : 'unknown'
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expense: 0 }
      if (line.account.accountType === 'revenue') monthlyData[monthKey].revenue += line.creditAmount - line.debitAmount
      if (line.account.accountType === 'expense') monthlyData[monthKey].expense += line.debitAmount - line.creditAmount
    }

    return jsonResponse({
      data: {
        kpis: {
          revenue, expense, profit, cash, ar, ap, inventory,
          grossMargin: Math.round(grossMargin * 100) / 100,
          currentRatio: Math.round(currentRatio * 100) / 100,
          quickRatio: Math.round(quickRatio * 100) / 100,
          workingCapital,
        },
        trends: {
          monthly: Object.entries(monthlyData).map(([month, data]) => ({
            month, revenue: data.revenue, expense: data.expense, profit: data.revenue - data.expense,
          })).sort((a, b) => a.month.localeCompare(b.month)),
        },
        period: { from: yearStart.toISOString(), to: now.toISOString() },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate dashboard', statusCode: 500 })
  }
}
