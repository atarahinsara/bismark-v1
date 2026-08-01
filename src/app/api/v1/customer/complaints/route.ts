import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/customer/complaints
 * List complaints filed by the authenticated customer (resolved via Party link).
 * Requires: service.read
 *
 * F-03 fix (Audit v4): replaced `customerId: ctx.userId` (User ID, not Party ID)
 * with proper Party resolution via getCustomerPartyId(). Field name in schema is
 * `customerId` (String) which conventionally holds a Party ID.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.read')

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
      db.complaint.findMany({
        where: { tenantId, customerId: partyId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.complaint.count({ where: { tenantId, customerId: partyId } }),
    ])
    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list customer complaints', statusCode: 500 })
  }
}
