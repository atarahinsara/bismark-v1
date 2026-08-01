/**
 * POST /api/v1/technician-jobs/[id]/accept
 * Technician accepts an assigned job.
 *
 * State: assigned → accepted
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, NotFoundException, ConflictException } from '@/lib/shared'
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

    const job = await db.technicianJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) throw new NotFoundException('TechnicianJob', jobId)

    if (job.status !== 'assigned') {
      throw new ConflictException(`Job must be 'assigned' to accept (current: ${job.status})`)
    }

    const updated = await db.technicianJob.update({
      where: { id: jobId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        version: { increment: 1 },
      },
    })

    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'TechnicianJob',
        aggregateId: jobId,
        eventType: 'technician_job.accepted',
        eventVersion: '1.0',
        payload: { jobId, technicianId: job.technicianId, acceptedBy: ctx.userId },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    const responseBody = JSON.stringify({ data: updated })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to accept job', statusCode: 500 })
  }
}
