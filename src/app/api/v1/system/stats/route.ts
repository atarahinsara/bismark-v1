import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/system/stats
 *
 * Returns operational statistics for the dashboard (F-07 fix — Audit v4).
 * Replaces the hardcoded `dashboardStats` from `src/lib/mock-data.ts`.
 *
 * Requires: system.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'system.read')

    const tenantId = await getTenantId()

    // Run all count queries in parallel for performance
    const [
      totalUsers,
      activeUsers,
      lockedUsers,
      suspendedUsers,
      totalParties,
      totalRoles,
      totalBranches,
      activeSessions,
    ] = await Promise.all([
      db.user.count({ where: { tenantId, deletedAt: null } }),
      db.user.count({ where: { tenantId, deletedAt: null, isActive: true, status: 'active' } }),
      db.user.count({ where: { tenantId, deletedAt: null, lockedUntil: { gt: new Date() } } }),
      db.user.count({ where: { tenantId, deletedAt: null, status: 'suspended' } }),
      db.party.count({ where: { tenantId, deletedAt: null } }),
      db.role.count({ where: { tenantId, deletedAt: null } }),
      db.branch.count({ where: { tenantId, deletedAt: null } }),
      db.session.count({ where: { tenantId, status: 'active', expiresAt: { gt: new Date() } } }),
    ])

    return jsonResponse({
      data: {
        totalUsers,
        activeUsers,
        lockedUsers,
        suspendedUsers,
        totalParties,
        totalRoles,
        totalBranches,
        activeSessions,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch system stats', statusCode: 500 })
  }
}
