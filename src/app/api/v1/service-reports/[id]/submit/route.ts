/**
 * POST /api/v1/service-reports/[id]/submit
 * Submit a draft service report for approval.
 *
 * State: draft → submitted
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
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: reportId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    const report = await db.serviceReport.findFirst({ where: { id: reportId, tenantId } })
    if (!report) throw new NotFoundException('ServiceReport', reportId)

    if (report.status !== 'draft') {
      throw new ConflictException(`Report must be 'draft' to submit (current: ${report.status})`)
    }

    // Update with any additional data provided at submission
    const updated = await db.serviceReport.update({
      where: { id: reportId },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        ...(body.workSummary ? { workSummary: body.workSummary } : {}),
        ...(body.workPerformed ? { workPerformed: body.workPerformed } : {}),
        ...(body.partsUsed ? { partsUsed: body.partsUsed } : {}),
        ...(body.laborHours !== undefined ? { laborHours: Number(body.laborHours) } : {}),
        ...(body.laborCost !== undefined ? { laborCost: Number(body.laborCost) } : {}),
        ...(body.partsCost !== undefined ? { partsCost: Number(body.partsCost) } : {}),
        ...(body.photosBefore ? { photosBefore: body.photosBefore } : {}),
        ...(body.photosAfter ? { photosAfter: body.photosAfter } : {}),
        ...(body.customerSignature ? { customerSignature: body.customerSignature } : {}),
        ...(body.customerFeedback ? { customerFeedback: body.customerFeedback } : {}),
        ...(body.customerRating !== undefined ? { customerRating: Number(body.customerRating) } : {}),
        version: { increment: 1 },
      },
    })

    // Recalculate totalCost
    const totalCost = updated.laborCost + updated.partsCost
    await db.serviceReport.update({
      where: { id: reportId },
      data: { totalCost },
    })

    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'ServiceReport',
        aggregateId: reportId,
        eventType: 'service_report.submitted',
        eventVersion: '1.0',
        payload: {
          reportId,
          reportNumber: report.reportNumber,
          technicianJobId: report.technicianJobId,
          totalCost,
        },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    const responseBody = JSON.stringify({
      data: { message: 'Service report submitted', reportId, status: 'submitted', totalCost },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to submit report', statusCode: 500 })
  }
}
