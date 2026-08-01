import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/customer/warranties
 * List warranty cards held by the authenticated customer (resolved via Party link).
 * Requires: warranty.read
 *
 * F-03 fix (Audit v4): replaced `recipientId: ctx.userId` (non-existent field)
 * with proper `customerPartyId` query and Party resolution via getCustomerPartyId().
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'warranty.read')

    const tenantId = await getTenantId()
    const partyId = await getCustomerPartyId(ctx.userId, tenantId)
    if (!partyId) {
      return jsonResponse({
        data: [],
        meta: { page: 1, per_page: 20, total: 0, last_page: 1 },
      })
    }

    const params = parseQueryParams(request)
    const [items, total] = await Promise.all([
      db.warrantyCard.findMany({
        where: { tenantId, customerPartyId: partyId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.warrantyCard.count({ where: { tenantId, customerPartyId: partyId, deletedAt: null } }),
    ])
    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list customer warranties', statusCode: 500 })
  }
}
