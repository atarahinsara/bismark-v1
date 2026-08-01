/**
 * POST /api/v1/mobile/jobs/[id]/complete
 *
 * T-4-10: Complete a service job.
 *
 * Body: { completionNotes?, customerSignature? }
 *
 * Updates service order status to 'completed' + records completion.
 *
 * Requires: authenticated technician + job ownership
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, getCustomerPartyId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, NotFoundException, ConflictException, IdempotencyHelper } from '@/lib/shared'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.complete')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: serviceOrderId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    const partyId = await getCustomerPartyId(ctx.userId, tenantId)
    if (!partyId) {
      return errorResponse({ code: 'TECHNICIAN_NOT_LINKED', message: 'User not linked to a Party', statusCode: 400 })
    }

    const serviceOrder = await db.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId, deletedAt: null },
      include: { assignments: true },
    })

    if (!serviceOrder) {
      throw new NotFoundException('ServiceOrder', serviceOrderId)
    }

    const isAssigned = serviceOrder.assignments.some(
      (a) => a.technicianPartyId === partyId && a.status === 'active',
    )
    if (!isAssigned) {
      return errorResponse({ code: 'NOT_ASSIGNED', message: 'You are not assigned to this job', statusCode: 403 })
    }

    if (serviceOrder.status === 'completed' || serviceOrder.status === 'closed') {
      throw new ConflictException(`Job already ${serviceOrder.status}`)
    }

    // Validate signature required (LAW: completed job must have signature)
    if (!body.customerSignature) {
      throw new ValidationException('Customer signature required to complete job', [
        { field: 'customerSignature', message: 'Required', code: 'REQUIRED' },
      ])
    }

    // Complete the job
    const updated = await db.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        status: 'completed',
        actualCompletion: new Date(),
        metadata: {
          ...(serviceOrder as any).metadata,
          completedAt: new Date().toISOString(),
          completedBy: ctx.userId,
          completionNotes: body.completionNotes || null,
          customerSignature: body.customerSignature, // base64 or file ID
        },
      },
    })

    // Update assignment status
    await db.technicianAssignment.updateMany({
      where: { serviceOrderId, technicianPartyId: partyId, status: 'active' },
      data: { status: 'completed', endTime: new Date() },
    })

    // Emit outbox event
    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'ServiceOrder',
        aggregateId: serviceOrderId,
        eventType: 'service_order.completed',
        eventVersion: '1.0',
        payload: {
          serviceOrderId,
          technicianId: partyId,
          completedAt: new Date().toISOString(),
          completionNotes: body.completionNotes || null,
        },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    logger.info({ serviceOrderId, technicianId: partyId, userId: ctx.userId }, 'Job completed')

    const responseBody = JSON.stringify({
      data: {
        message: 'Job completed successfully',
        serviceOrderId,
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Job completion failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Completion failed', statusCode: 500 })
  }
}
