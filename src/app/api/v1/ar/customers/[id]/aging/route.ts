import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/ar/customers/{id}/aging
 * Aging Report: Current, 30, 60, 90, 120+ days.
 * Based on open (unallocated) debit transactions.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const tenantId = await getTenantId()
    const now = new Date()

    const openTransactions = await db.aRTransaction.findMany({
      where: { tenantId, customerPartyId: params.id, status: { in: ['open', 'partially_allocated'] }, amount: { gt: 0 } },
      orderBy: { entryDate: 'asc' },
    })

    const buckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days120: 0,
    }

    const items = openTransactions.map((t) => {
      const daysOverdue = Math.floor((now.getTime() - t.entryDate.getTime()) / (1000 * 60 * 60 * 24))
      const openAmount = t.openAmount

      if (daysOverdue <= 0) buckets.current += openAmount
      else if (daysOverdue <= 30) buckets.days30 += openAmount
      else if (daysOverdue <= 60) buckets.days60 += openAmount
      else if (daysOverdue <= 90) buckets.days90 += openAmount
      else buckets.days120 += openAmount

      return {
        id: t.id,
        date: t.entryDate.toISOString(),
        type: t.transactionType,
        referenceType: t.referenceType,
        openAmount,
        daysOverdue,
        bucket: daysOverdue <= 0 ? 'current' : daysOverdue <= 30 ? '1-30' : daysOverdue <= 60 ? '31-60' : daysOverdue <= 90 ? '61-90' : '90+',
      }
    })

    const totalOpen = items.reduce((s, i) => s + i.openAmount, 0)

    return jsonResponse({
      data: {
        customerPartyId: params.id,
        totalOpen,
        buckets: {
          current: buckets.current,
          '1-30': buckets.days30,
          '31-60': buckets.days60,
          '61-90': buckets.days90,
          '90+': buckets.days120,
        },
        items,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate aging', statusCode: 500 })
  }
}
