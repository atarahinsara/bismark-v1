/**
 * GET /api/v1/customers/[id]/360
 *
 * T-5-07: Customer 360 View — aggregated customer data.
 *
 * Returns:
 *   - Profile (Party)
 *   - Purchases (count + total)
 *   - Products (count)
 *   - Warranties (count + active count)
 *   - Services (count + last 5)
 *   - Complaints (count + open count)
 *   - Payments (total paid)
 *   - Satisfaction (avg survey rating)
 *   - Loyalty (points + tier)
 *
 * This is a real-time aggregation (no projection table for V1).
 * In V2, replace with Customer360View projection for performance.
 *
 * Requires: crm.read OR customer is viewing own profile
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, NotFoundException } from '@/lib/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const { id: partyId } = await params
    const tenantId = await getTenantId()

    // Verify party exists
    const party = await db.party.findFirst({
      where: { id: partyId, tenantId, deletedAt: null },
    })
    if (!party) {
      throw new NotFoundException('Party', partyId)
    }

    // Authorization: must have crm.read OR be the customer themselves
    try {
      await requirePermission(ctx, 'crm.read')
    } catch {
      // Check if this is the customer's own profile
      const userPartyId = await db.user.findFirst({
        where: { id: ctx.userId, tenantId },
        select: { metadata: true },
      })
      const meta = userPartyId?.metadata as Record<string, unknown> | null
      if (meta?.partyId !== partyId) {
        return errorResponse({
          code: 'FORBIDDEN',
          message: 'You can only view your own 360 profile',
          statusCode: 403,
        })
      }
    }

    // Run all aggregations in parallel
    const [
      salesOrders,
      productInstances,
      warrantyCards,
      serviceRequests,
      complaints,
      payments,
      surveys,
      loyaltyAccount,
    ] = await Promise.all([
      // Purchases
      db.salesOrder.findMany({
        where: { tenantId, customerPartyId: partyId, deletedAt: null },
        select: { id: true, totalAmount: true, orderDate: true, status: true },
      }),
      // Products (via warranty cards)
      db.warrantyCard.findMany({
        where: { tenantId, customerPartyId: partyId, deletedAt: null },
        select: { id: true, productInstanceId: true },
      }),
      // Warranties
      db.warrantyCard.findMany({
        where: { tenantId, customerPartyId: partyId, deletedAt: null },
        select: { id: true, status: true, endDate: true },
      }),
      // Service requests
      db.serviceRequest.findMany({
        where: { tenantId, customerPartyId: partyId, deletedAt: null },
        select: { id: true, requestNumber: true, status: true, createdAt: true, priority: true, customerProblem: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Complaints
      db.complaint.findMany({
        where: { tenantId, customerId: partyId },
        select: { id: true, status: true, severity: true },
      }),
      // Payments
      db.payment.findMany({
        where: { tenantId, customerPartyId: partyId, deletedAt: null },
        select: { id: true, amount: true, paymentDate: true, status: true },
      }),
      // Surveys (satisfaction)
      db.survey.findMany({
        where: { tenantId, customerId: partyId },
        select: { id: true, overallRating: true, npsScore: true },
      }),
      // Loyalty
      db.loyaltyAccount.findFirst({
        where: { tenantId, partyId },
        select: { id: true, points: true, tier: true, totalSpent: true },
      }),
    ])

    // Calculate aggregates
    const totalPurchases = salesOrders.length
    const totalSpent = salesOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const lastPurchaseDate = salesOrders.length > 0
      ? salesOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
      : null

    const activeWarranties = warrantyCards.filter(
      (w) => w.status === 'active' && (!w.endDate || w.endDate > new Date()),
    ).length

    const openComplaints = complaints.filter((c) => c.status === 'open' || c.status === 'investigating').length

    const totalPaid = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)

    const ratings = surveys.filter((s) => s.overallRating !== null).map((s) => s.overallRating!)
    const avgSatisfaction = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null

    const npsScores = surveys.filter((s) => s.npsScore !== null).map((s) => s.npsScore!)
    const avgNps = npsScores.length > 0
      ? npsScores.reduce((sum, n) => sum + n, 0) / npsScores.length
      : null

    return jsonResponse({
      data: {
        profile: {
          id: party.id,
          businessCode: party.businessCode,
          partyType: party.partyType,
          displayName: party.displayName,
          status: party.status,
        },
        purchases: {
          total: totalPurchases,
          totalSpent,
          lastPurchaseDate,
        },
        products: {
          count: productInstances.length,
        },
        warranties: {
          total: warrantyCards.length,
          active: activeWarranties,
        },
        services: {
          total: serviceRequests.length,
          recent: serviceRequests,
        },
        complaints: {
          total: complaints.length,
          open: openComplaints,
        },
        payments: {
          totalPaid,
        },
        satisfaction: {
          avgRating: avgSatisfaction,
          avgNps: avgNps,
          surveyCount: surveys.length,
        },
        loyalty: loyaltyAccount ? {
          points: loyaltyAccount.points,
          tier: loyaltyAccount.tier,
          totalSpent: loyaltyAccount.totalSpent,
        } : null,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch Customer 360', statusCode: 500 })
  }
}
