/**
 * POST /api/v1/technician-jobs/[id]/cancel
 * Cancel a technician job.
 *
 * State: any → cancelled (except 'completed')
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, ConflictException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: jobId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    if (!body.reason) {
      throw new ValidationException('Cancellation reason required', [
        { field: 'reason', message: 'Required for audit trail', code: 'REQUIRED' },
      ])
    }

    const job = await db.technicianJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) throw new NotFoundException('TechnicianJob', jobId)

    if (job.status === 'completed') {
      throw new ConflictException('Cannot cancel a completed job')
    }

    if (job.status === 'cancelled') {
      // Idempotent — already cancelled
      const responseBody = JSON.stringify({ data: { message: 'Job already cancelled', jobId } })
      await IdempotencyHelper.store(request, responseBody, 200, rawBody)
      return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const updated = await db.technicianJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: body.reason,
        version: { increment: 1 },
      },
    })

    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'TechnicianJob',
        aggregateId: jobId,
        eventType: 'technician_job.cancelled',
        eventVersion: '1.0',
        payload: { jobId, reason: body.reason, cancelledBy: ctx.userId },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    const responseBody = JSON.stringify({ data: updated })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to cancel job', statusCode: 500 })
  }
}
