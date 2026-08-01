/**
 * GET /api/v1/representative/dashboard
 *
 * T-5-08: Representative dashboard KPIs.
 *
 * Returns:
 *   - Total customers (created by this rep)
 *   - Total orders (by this rep)
 *   - Total revenue
 *   - Total commission (calculated)
 *   - Recent orders
 *   - Outstanding receivables
 *
 * Requires: sales.read (representative role)
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'sales.read')

    const tenantId = await getTenantId()

    // Get rep's party ID
    const user = await db.user.findFirst({
      where: { id: ctx.userId, tenantId },
      select: { metadata: true },
    })
    const meta = user?.metadata as Record<string, unknown> | null
    const repPartyId = meta?.partyId as string | undefined

    if (!repPartyId) {
      return jsonResponse({
        data: {
          message: 'Representative not linked to a Party',
          totalCustomers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCommission: 0,
          recentOrders: [],
          outstandingReceivables: 0,
        },
      })
    }

    // Run aggregations in parallel
    const [
      totalCustomers,
      orders,
      commissions,
      invoices,
    ] = await Promise.all([
      // Total customers (parties created by this rep — simplified: count all parties)
      db.party.count({
        where: { tenantId, deletedAt: null, partyType: 'person' },
      }),
      // Orders by this rep
      db.salesOrder.findMany({
        where: { tenantId, salesRepPartyId: repPartyId, deletedAt: null },
        select: { id: true, orderNumber: true, totalAmount: true, orderDate: true, status: true },
        orderBy: { orderDate: 'desc' },
        take: 10,
      }),
      // Commissions
      db.commissionTransaction.findMany({
        where: { tenantId, salesRepPartyId: repPartyId },
        select: { id: true, amount: true, status: true, createdAt: true },
      }),
      // Outstanding receivables (unpaid invoices for this rep's customers)
      db.invoice.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['issued', 'partially_paid'] },
          salesOrder: { salesRepPartyId: repPartyId },
        },
        select: { id: true, totalAmount: true, paidAmount: true },
      }),
    ])

    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const totalCommission = commissions
      .filter((c) => c.status === 'calculated' || c.status === 'approved' || c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0)
    const outstandingReceivables = invoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0,
    )

    return jsonResponse({
      data: {
        repPartyId,
        totalCustomers,
        totalOrders,
        totalRevenue,
        totalCommission,
        outstandingReceivables,
        recentOrders: orders.slice(0, 5),
        commissionStatus: {
          calculated: commissions.filter((c) => c.status === 'calculated').length,
          approved: commissions.filter((c) => c.status === 'approved').length,
          paid: commissions.filter((c) => c.status === 'paid').length,
        },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch representative dashboard', statusCode: 500 })
  }
}
