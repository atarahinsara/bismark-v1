/**
 * GET /api/v1/service-reports
 * POST /api/v1/service-reports
 *
 * Golden Slice — ServiceReport CRUD
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const technicianJobId = url.searchParams.get('technicianJobId')
    const status = url.searchParams.get('status')

    const where = {
      tenantId,
      ...(technicianJobId ? { technicianJobId } : {}),
      ...(status ? { status } : {}),
    }

    const [items, total] = await Promise.all([
      db.serviceReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.serviceReport.count({ where }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list service reports', statusCode: 500 })
  }
}

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

    // Validation
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.technicianJobId) errors.push({ field: 'technicianJobId', message: 'Technician job is required', code: 'REQUIRED' })
    if (!body.technicianId) errors.push({ field: 'technicianId', message: 'Technician is required', code: 'REQUIRED' })
    if (!body.workSummary) errors.push({ field: 'workSummary', message: 'Work summary is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    // Verify job exists
    const job = await db.technicianJob.findFirst({
      where: { id: body.technicianJobId, tenantId },
    })
    if (!job) throw new NotFoundException('TechnicianJob', body.technicianJobId)

    // Check if report already exists for this job
    const existing = await db.serviceReport.findFirst({
      where: { tenantId, technicianJobId: body.technicianJobId },
    })
    if (existing) {
      return errorResponse({
        code: 'CONFLICT',
        message: 'ServiceReport already exists for this job',
        statusCode: 409,
      })
    }

    const reportNumber = await BusinessCodeGenerator.generate('service_report', tenantId)

    const laborHours = Number(body.laborHours) || 0
    const laborCost = Number(body.laborCost) || 0
    const partsCost = Number(body.partsCost) || 0
    const totalCost = laborCost + partsCost

    const item = await db.serviceReport.create({
      data: {
        tenantId,
        reportNumber,
        technicianJobId: body.technicianJobId,
        serviceOrderId: job.serviceOrderId ?? null,
        technicianId: body.technicianId,
        status: 'draft',
        workSummary: body.workSummary,
        workPerformed: body.workPerformed ?? [],
        partsUsed: body.partsUsed ?? [],
        laborHours,
        laborCost,
        partsCost,
        totalCost,
        photosBefore: body.photosBefore ?? null,
        photosAfter: body.photosAfter ?? null,
        customerSignature: body.customerSignature ?? null,
        customerFeedback: body.customerFeedback ?? null,
        customerRating: body.customerRating ?? null,
        notes: body.notes ?? null,
        metadata: body.metadata ?? {},
        version: 1,
      },
    })

    // Link report to job
    await db.technicianJob.update({
      where: { id: body.technicianJobId },
      data: { serviceReportId: item.id },
    })

    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'ServiceReport',
        aggregateId: item.id,
        eventType: 'service_report.created',
        eventVersion: '1.0',
        payload: {
          reportId: item.id,
          reportNumber,
          technicianJobId: body.technicianJobId,
          technicianId: body.technicianId,
          totalCost,
        },
        actorId: ctx.userId,
        status: 'pending',
      },
    })

    const responseBody = JSON.stringify({ data: item })
    await IdempotencyHelper.store(request, responseBody, 201, rawBody)
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create service report', statusCode: 500 })
  }
}
