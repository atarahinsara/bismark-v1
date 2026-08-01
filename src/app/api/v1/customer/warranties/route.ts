import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'warranty.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const [items, total] = await Promise.all([
      db.warrantyCard.findMany({
        where: { tenantId, recipientId: ctx.userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage, take: params.perPage,
      }),
      db.warrantyCard.count({ where: { tenantId, recipientId: ctx.userId } }),
    ])
    return jsonResponse({ data: items, meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed', statusCode: 500 })
  }
}
