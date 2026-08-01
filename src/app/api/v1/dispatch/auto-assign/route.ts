/**
 * POST /api/v1/dispatch/auto-assign
 *
 * T-6-03: Auto-assign best technician to a service request.
 *
 * Body: { serviceRequestId }
 *
 * Requires: service.create
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, NotFoundException, ConflictException, IdempotencyHelper } from '@/lib/shared'
import { autoAssignTechnician } from '@/lib/dispatch-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const tenantId = await getTenantId()

    if (!body.serviceRequestId) {
      throw new ValidationException('serviceRequestId required', [
        { field: 'serviceRequestId', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Verify service request exists and doesn't already have an active assignment
    const sr = await db.serviceRequest.findFirst({
      where: { id: body.serviceRequestId, tenantId, deletedAt: null },
      include: {
        assignments: {
          where: { status: 'active' },
        },
      },
    })

    if (!sr) {
      throw new NotFoundException('ServiceRequest', body.serviceRequestId)
    }

    if (sr.assignments.length > 0) {
      throw new ConflictException('Service request already has an active assignment')
    }

    const result = await autoAssignTechnician(body.serviceRequestId, tenantId, ctx.userId)

    const responseBody = JSON.stringify({
      data: {
        message: 'Technician assigned successfully',
        serviceRequestId: body.serviceRequestId,
        technicianId: result.technicianId,
        assignmentId: result.assignmentId,
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Auto-assign failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Auto-assign failed', statusCode: 500 })
  }
}
