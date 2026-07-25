import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/workflow/instances/{id}
 * Show instance with full history.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const instance = await db.workflowInstance.findFirst({
      where: { id: params.id, tenantId },
      include: { history: { orderBy: { changedAt: 'asc' } }, definition: { select: { states: true, transitions: true } } },
    })
    if (!instance) throw new NotFoundException('WorkflowInstance', params.id)

    // Compute available transitions from current state
    const transitions = instance.definition.transitions as any[]
    const availableTransitions = transitions.filter((t) => t.fromState === instance.currentStateKey)

    return jsonResponse({
      data: {
        id: instance.id, definitionKey: instance.definitionKey, definitionVersion: instance.definitionVersion,
        entityType: instance.entityType, entityId: instance.entityId,
        currentStateKey: instance.currentStateKey, status: instance.status,
        startedBy: instance.startedBy, startedAt: instance.startedAt.toISOString(),
        completedAt: instance.completedAt?.toISOString() ?? null,
        version: instance.version,
        availableTransitions: availableTransitions.map((t) => ({ key: t.key, toState: t.toState, requiredPermission: t.requiredPermission ?? null })),
      },
      history: instance.history.map((h) => ({
        id: h.id, fromState: h.fromState, toState: h.toState, transitionKey: h.transitionKey,
        changedBy: h.changedBy, changedAt: h.changedAt.toISOString(), reason: h.reason,
      })),
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch instance', statusCode: 500 })
  }
}

/**
 * POST /api/v1/workflow/instances/{id}/cancel
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const instance = await db.workflowInstance.findFirst({ where: { id: params.id, tenantId } })
    if (!instance) throw new NotFoundException('WorkflowInstance', params.id)
    if (instance.status !== 'running') throw new ValidationException('Must be running to cancel', [{ field: 'status', message: `Current: ${instance.status}`, code: 'INVALID_STATE' }])

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.workflowInstance.updateMany({
        where: { id: instance.id, version: instance.version },
        data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: body.cancelledBy ?? null, cancelReason: body.reason ?? null, version: { increment: 1 } },
      })

      await uow.tx.workflowHistory.create({
        data: { tenantId, instanceId: instance.id, fromState: instance.currentStateKey, toState: 'cancelled', transitionKey: null, changedBy: body.cancelledBy ?? null, reason: body.reason ?? 'Cancelled' },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'WorkflowInstance', aggregateId: instance.id,
        eventType: 'workflow.cancelled', eventVersion: '1.0',
        payload: { definitionKey: instance.definitionKey, reason: body.reason ?? null },
        actorId: body.cancelledBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: instance.id, status: 'cancelled' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to cancel', statusCode: 500 })
  }
}
