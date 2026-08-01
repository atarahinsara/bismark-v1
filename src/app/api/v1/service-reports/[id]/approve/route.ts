/**
 * POST /api/v1/service-reports/[id]/approve
 * Approve a submitted service report.
 *
 * State: submitted → approved
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, NotFoundException, ConflictException, ValidationException } from '@/lib/shared'
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

    const { id: reportId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()

    const report = await db.serviceReport.findFirst({ where: { id: reportId, tenantId } })
    if (!report) throw new NotFoundException('ServiceReport', reportId)

    if (report.status !== 'submitted') {
      throw new ConflictException(`Report must be 'submitted' to approve (current: ${report.status})`)
    }

    const updated = await db.serviceReport.update({
      where: { id: reportId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: ctx.userId,
        version: { increment: 1 },
      },
    })

    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'ServiceReport',
        aggregateId: reportId,
        eventType: 'service_report.approved',
        eventVersion: '1.0',
        payload: {
          reportId,
          reportNumber: report.reportNumber,
          technicianJobId: report.technicianJobId,
          approvedBy: ctx.userId,
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
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to approve report', statusCode: 500 })
  }
}
