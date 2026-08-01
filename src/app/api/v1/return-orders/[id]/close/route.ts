import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/return-orders/{id}/close
 * Close return order — final state.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'return.receive')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const ret = await db.returnOrder.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!ret) throw new NotFoundException('ReturnOrder', params.id)
    if (ret.status !== 'received') {
      throw new ValidationException('Return must be received to close', [
        { field: 'status', message: `Current: ${ret.status}`, code: 'INVALID_STATE' },
      ])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.returnOrder.updateMany({
        where: { id: ret.id, version: ret.version },
        data: { status: 'closed', closedAt: new Date(), version: { increment: 1 } },
      })
      await uow.outbox.append({
        tenantId, aggregateType: 'ReturnOrder', aggregateId: ret.id,
        eventType: 'return_order.closed', eventVersion: '1.0',
        payload: { returnNumber: ret.returnNumber },
        actorId: null,
      })
    })

    const response = jsonResponse({ data: { id: ret.id, status: 'closed' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, "{}")
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to close return', statusCode: 500 })
  }
}
