/**
 * GET /api/v1/mobile/assignments
 *
 * T-4-03: Get jobs assigned to the authenticated technician.
 *
 * Returns service orders where technicianPartyId matches the user's Party.
 *
 * Requires: authenticated technician + service.read
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'

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

    // Find service orders assigned to this technician
    const [items, total] = await Promise.all([
      db.serviceOrder.findMany({
        where: {
          tenantId,
          deletedAt: null,
          // Service orders linked to this technician via TechnicianAssignment
          assignments: {
            some: {
              technicianPartyId: partyId,
              status: 'active',
            },
          },
        },
        include: {
          serviceRequest: {
            select: {
              id: true,
              requestNumber: true,
              customerPartyId: true,
              customerProblem: true,
              priority: true,
              productInstanceId: true,
            },
          },
          assignments: {
            where: { technicianPartyId: partyId, status: 'active' },
            select: { id: true, assignmentType: true, assignedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.serviceOrder.count({
        where: {
          tenantId,
          deletedAt: null,
          assignments: {
            some: {
              technicianPartyId: partyId,
              status: 'active',
            },
          },
        },
      }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list assignments', statusCode: 500 })
  }
}
