import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/service-orders/{id}/qc
 * Record Quality Control check (LAW-32: required before delivery).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.update')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.result) throw new ValidationException('QC result is required', [{ field: 'result', message: 'Required: pass|fail|conditional', code: 'REQUIRED' }])
    const validResults = ['pass', 'fail', 'conditional']
    if (!validResults.includes(body.result)) throw new ValidationException('Invalid QC result', [{ field: 'result', message: `Must be: ${validResults.join('|')}`, code: 'INVALID' }])

    const order = await db.serviceOrder.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!order) throw new NotFoundException('ServiceOrder', params.id)
    if (order.status !== 'repair') throw new ValidationException('Order must be in repair to do QC', [{ field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' }])

    const qcNumber = await BusinessCodeGenerator.generate('quality_check', tenantId)

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.serviceQualityCheck.create({
        data: {
          tenantId, qcNumber, serviceOrderId: order.id,
          inspectorPartyId: body.inspectorId ?? order.assignedTechnicianId ?? null,
          result: body.result,
          checklist: body.checklist ?? { items: [] },
          defectsFound: body.defectsFound ?? null,
          reworkRequired: body.result === 'fail',
          reworkNotes: body.reworkNotes ?? null,
          notes: body.notes ?? null,
        },
      })

      // Transition based on QC result
      const newStatus = body.result === 'pass' || body.result === 'conditional' ? 'qc' : 'repair' // fail → back to repair
      await uow.tx.serviceOrder.updateMany({
        where: { id: order.id, version: order.version },
        data: { status: newStatus, qcDate: new Date(), version: { increment: 1 } },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ServiceOrder', aggregateId: order.id,
        eventType: 'service_order.qc_completed', eventVersion: '1.0',
        payload: { orderNumber: order.orderNumber, qcNumber, result: body.result },
        actorId: body.inspectorId ?? null,
      })
    })

    const response = jsonResponse({
      data: { id: order.id, qcNumber, result: body.result, status: body.result === 'fail' ? 'repair (rework)' : 'qc', message: body.result === 'fail' ? 'QC failed — sent back for rework' : 'QC passed — ready for delivery (LAW-32)' },
    })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to record QC', statusCode: 500 })
  }
}
