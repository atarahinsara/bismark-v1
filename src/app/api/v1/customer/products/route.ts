import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/customer/products
 * List product instances owned by the authenticated customer (via WarrantyCard
 * linkage, since ProductInstance has no `currentOwnerId` field).
 * Requires: product.read
 *
 * F-03 fix (Audit v4): replaced `currentOwnerId: ctx.userId` (non-existent field)
 * with a query that finds ProductInstances linked to the customer via WarrantyCard
 * (which has `customerPartyId`).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'product.read')

    const tenantId = await getTenantId()
    const partyId = await getCustomerPartyId(ctx.userId, tenantId)
    if (!partyId) {
      return jsonResponse({
        data: [],
        meta: { page: 1, per_page: 20, total: 0, last_page: 1 },
      })
    }

    // Find warranty cards held by this customer; collect product_instance IDs.
    const warrantyCards = await db.warrantyCard.findMany({
      where: { tenantId, customerPartyId: partyId, deletedAt: null },
      select: { productInstanceId: true },
    })
    const productInstanceIds = [...new Set(warrantyCards.map((w) => w.productInstanceId))]

    if (productInstanceIds.length === 0) {
      return jsonResponse({
        data: [],
        meta: { page: 1, per_page: 20, total: 0, last_page: 1 },
      })
    }

    const params = parseQueryParams(request)
    const [items, total] = await Promise.all([
      db.productInstance.findMany({
        where: { tenantId, id: { in: productInstanceIds } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.productInstance.count({ where: { tenantId, id: { in: productInstanceIds } } }),
    ])
    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list customer products', statusCode: 500 })
  }
}
