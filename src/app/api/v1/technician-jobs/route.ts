/**
 * GET /api/v1/technician-jobs
 * POST /api/v1/technician-jobs
 *
 * Golden Slice — TechnicianJob CRUD
 * Queen Correction 1: TechnicianJob is independent of ServiceOrder.
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
    const status = url.searchParams.get('status')
    const technicianId = url.searchParams.get('technicianId')

    const where = {
      tenantId,
      ...(status ? { status } : {}),
      ...(technicianId ? { technicianId } : {}),
    }

    const [items, total] = await Promise.all([
      db.technicianJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.technicianJob.count({ where }),
    ])

    return jsonResponse({
      data: items,
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list technician jobs', statusCode: 500 })
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
    if (!body.customerId) errors.push({ field: 'customerId', message: 'Customer is required', code: 'REQUIRED' })
    if (errors.length > 0) throw new ValidationException('Missing required fields', errors)

    const jobNumber = await BusinessCodeGenerator.generate('technician_job', tenantId)

    const item = await db.technicianJob.create({
      data: {
        tenantId,
        jobNumber,
        serviceRequestId: body.serviceRequestId ?? null,
        serviceOrderId: body.serviceOrderId ?? null,
        technicianId: body.technicianId ?? null,
        customerId: body.customerId,
        productInstanceId: body.productInstanceId ?? null,
        status: body.technicianId ? 'assigned' : 'created',
        priority: body.priority ?? 'normal',
        scheduledStartTime: body.scheduledStartTime ? new Date(body.scheduledStartTime) : null,
        scheduledEndTime: body.scheduledEndTime ? new Date(body.scheduledEndTime) : null,
        notes: body.notes ?? null,
        metadata: body.metadata ?? {},
        version: 1,
      },
    })

    // Emit outbox event
    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'TechnicianJob',
        aggregateId: item.id,
        eventType: 'technician_job.created',
        eventVersion: '1.0',
        payload: { jobId: item.id, jobNumber, customerId: body.customerId, technicianId: body.technicianId ?? null },
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
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create technician job', statusCode: 500 })
  }
}
