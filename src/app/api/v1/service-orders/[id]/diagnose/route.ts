import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/service-orders/{id}/diagnose
 * Record diagnosis — transitions open → diagnosis.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    const order = await db.serviceOrder.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!order) throw new NotFoundException('ServiceOrder', params.id)
    if (order.status !== 'open') throw new ValidationException('Order must be open to diagnose', [{ field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' }])

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.serviceDiagnosis.create({
        data: {
          tenantId, serviceOrderId: order.id,
          technicianPartyId: body.technicianId ?? order.assignedTechnicianId ?? '',
          symptom: body.symptom ?? 'Unknown',
          rootCause: body.rootCause ?? null,
          recommendedAction: body.recommendedAction ?? null,
          estimatedHours: body.estimatedHours ?? null,
          estimatedPartsCost: body.estimatedPartsCost ?? null,
          confidenceLevel: body.confidenceLevel ?? 'medium',
          notes: body.notes ?? null,
        },
      })

      await uow.tx.serviceOrder.updateMany({
        where: { id: order.id, version: order.version },
        data: { status: 'diagnosis', diagnosisDate: new Date(), version: { increment: 1 } },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ServiceOrder', aggregateId: order.id,
        eventType: 'service_order.diagnosed', eventVersion: '1.0',
        payload: { orderNumber: order.orderNumber, symptom: body.symptom },
        actorId: body.technicianId ?? null,
      })
    })

    const response = jsonResponse({ data: { id: order.id, status: 'diagnosis' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to diagnose', statusCode: 500 })
  }
}
