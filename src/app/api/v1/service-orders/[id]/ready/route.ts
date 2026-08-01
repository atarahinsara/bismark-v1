import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/service-orders/{id}/ready
 * Mark order as ready for delivery.
 * LAW-32: QC must have passed before this transition.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.complete')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const order = await db.serviceOrder.findFirst({ where: { id: params.id, tenantId, deletedAt: null }, include: { qcChecks: true } })
    if (!order) throw new NotFoundException('ServiceOrder', params.id)
    if (order.status !== 'qc') throw new ValidationException('Order must be in QC status', [{ field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' }])

    // LAW-32: Verify QC passed
    const passedQC = order.qcChecks.some((qc) => qc.result === 'pass' || qc.result === 'conditional')
    if (!passedQC) {
      throw new ValidationException('QC must pass before ready (LAW-32)', [
        { field: 'qc', message: 'No passing QC found', code: 'QC_NOT_PASSED' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.serviceOrder.updateMany({
        where: { id: order.id, version: order.version },
        data: { status: 'ready', readyDate: new Date(), version: { increment: 1 } },
      })
      await uow.outbox.append({
        tenantId, aggregateType: 'ServiceOrder', aggregateId: order.id,
        eventType: 'service_order.ready', eventVersion: '1.0',
        payload: { orderNumber: order.orderNumber },
        actorId: null,
      })
    })

    const response = jsonResponse({ data: { id: order.id, status: 'ready', message: 'Order ready for delivery (LAW-32: QC passed).' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, "{}")
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to mark ready', statusCode: 500 })
  }
}
