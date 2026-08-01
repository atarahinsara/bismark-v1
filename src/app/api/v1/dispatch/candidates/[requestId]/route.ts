/**
 * GET /api/v1/dispatch/candidates/[requestId]
 *
 * T-6-01: Find candidate technicians for a service request.
 * Returns top-3 candidates with scores.
 *
 * Requires: service.read
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, NotFoundException } from '@/lib/shared'
import { findCandidateTechnicians } from '@/lib/dispatch-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.read')

    const { requestId } = await params
    const tenantId = await getTenantId()

    // Verify service request exists
    const sr = await db.serviceRequest.findFirst({
      where: { id: requestId, tenantId, deletedAt: null },
      select: { id: true, requestNumber: true, priority: true },
    })
    if (!sr) {
      throw new NotFoundException('ServiceRequest', requestId)
    }

    const candidates = await findCandidateTechnicians({
      serviceRequestId: requestId,
      tenantId,
    })

    return jsonResponse({
      data: {
        serviceRequestId: requestId,
        requestNumber: sr.requestNumber,
        priority: sr.priority,
        candidates,
        count: candidates.length,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to find candidates', statusCode: 500 })
  }
}
