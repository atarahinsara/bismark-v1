/**
 * POST /api/v1/technician-jobs/[id]/complete
 * Complete a technician job. Requires ServiceReport to be submitted first.
 *
 * State: accepted|in_progress → completed
 *
 * LAW-32: Every repair must pass Quality Control before delivery.
 * This route checks that a ServiceReport exists and is at least 'submitted'.
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
    await requirePermission(ctx, 'service.complete')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: jobId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    const job = await db.technicianJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) throw new NotFoundException('TechnicianJob', jobId)

    if (job.status !== 'accepted' && job.status !== 'in_progress') {
      throw new ConflictException(`Job must be 'accepted' or 'in_progress' to complete (current: ${job.status})`)
    }

    // Verify ServiceReport exists and is submitted (LAW-32 equivalent)
    const report = await db.serviceReport.findFirst({
      where: { tenantId, technicianJobId: jobId },
    })

    if (!report) {
      throw new ValidationException('ServiceReport must be created before completing job', [
        { field: 'serviceReport', message: 'Create a ServiceReport first', code: 'REQUIRED' },
      ])
    }

    if (report.status === 'draft') {
      throw new ConflictException('ServiceReport must be submitted before completing job')
    }

    const updated = await db.technicianJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        actualStartTime: job.actualStartTime ?? new Date(),
        actualEndTime: new Date(),
        completedAt: new Date(),
        serviceReportId: report.id,
        notes: body.notes ? `${job.notes || ''}\n${body.notes}`.trim() : job.notes,
        version: { increment: 1 },
      },
    })

    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'TechnicianJob',
        aggregateId: jobId,
        eventType: 'technician_job.completed',
        eventVersion: '1.0',
        payload: {
          jobId,
          technicianId: job.technicianId,
          serviceReportId: report.id,
          completedBy: ctx.userId,
        },
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
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to complete job', statusCode: 500 })
  }
}
