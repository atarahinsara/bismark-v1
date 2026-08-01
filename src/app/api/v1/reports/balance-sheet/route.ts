import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reports/balance-sheet?asOfDate=...
 * LAW-46: Derived from posted JEs only.
 * LAW-47: Reproducible for any historical date.
 * LAW-48: Read-only (never mutates accounting data).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.reports')

    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const asOfDate = url.searchParams.get('asOfDate') ? new Date(url.searchParams.get('asOfDate')!) : new Date()
    const costCenterId = url.searchParams.get('cost_center_id')

    // LAW-46: Get all posted JE lines up to asOfDate
    const lines = await db.journalEntryLine.findMany({
      where: {
        tenantId,
        ...(costCenterId ? { costCenterId } : {}),
        journalEntry: { status: 'posted', deletedAt: null, entryDate: { lte: asOfDate } },
      },
      include: { account: true },
    })

    // Group by account type
    const groups: Record<string, { accounts: any[]; total: number }> = {
      asset: { accounts: [], total: 0 },
      liability: { accounts: [], total: 0 },
      equity: { accounts: [], total: 0 },
    }

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
      const isDebitNormal = acct.type === 'asset' || acct.type === 'expense'
      const balance = isDebitNormal ? acct.debit - acct.credit : acct.credit - acct.debit
      if (groups[acct.type]) {
        groups[acct.type].accounts.push({ ...acct, balance })
        groups[acct.type].total += balance
      }
    }

    const totalAssets = groups.asset.total
    const totalLiabilities = groups.liability.total
    const totalEquity = groups.equity.total
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
    const difference = totalAssets - totalLiabilitiesAndEquity

    return jsonResponse({
      data: {
        reportType: 'balance_sheet',
        asOfDate: asOfDate.toISOString(),
        assets: {
          accounts: groups.asset.accounts.sort((a, b) => a.code.localeCompare(b.code)),
          total: totalAssets,
        },
        liabilities: {
          accounts: groups.liability.accounts.sort((a, b) => a.code.localeCompare(b.code)),
          total: totalLiabilities,
        },
        equity: {
          accounts: groups.equity.accounts.sort((a, b) => a.code.localeCompare(b.code)),
          total: totalEquity,
        },
        totals: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalLiabilitiesAndEquity,
          difference, // LAW-35: should be 0
          isBalanced: Math.abs(difference) < 0.01,
        },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate balance sheet', statusCode: 500 })
  }
}
