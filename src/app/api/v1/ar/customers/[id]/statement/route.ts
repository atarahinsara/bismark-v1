import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/ar/customers/{id}/statement
 * Customer Statement: opening balance, all transactions, running balance, closing balance.
 * LAW-42: Balance derived from transactions, not stored.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')

    const transactions = await db.aRTransaction.findMany({
      where: {
        tenantId,
        customerPartyId: params.id,
        ...(fromDate || toDate ? {
          entryDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        } : {}),
      },
      orderBy: { entryDate: 'asc' },
    })

    // Build statement with running balance
    let runningBalance = 0
    const lines = transactions.map((t) => {
      const debit = t.amount > 0 ? t.amount : 0
      const credit = t.amount < 0 ? Math.abs(t.amount) : 0
      runningBalance += debit - credit
      return {
        id: t.id,
        date: t.entryDate.toISOString(),
        type: t.transactionType,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        debit,
        credit,
        openAmount: t.openAmount,
        status: t.status,
        runningBalance,
        description: t.description,
      }
    })

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0)

    return jsonResponse({
      data: {
        customerPartyId: params.id,
        period: { fromDate, toDate },
        openingBalance: runningBalance - (totalDebit - totalCredit),
        closingBalance: runningBalance,
        totalDebit,
        totalCredit,
        transactionCount: lines.length,
        lines,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate statement', statusCode: 500 })
  }
}
