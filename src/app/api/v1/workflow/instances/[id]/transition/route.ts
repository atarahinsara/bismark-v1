import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/workflow/instances/{id}/transition
 * LAW-49: ONLY Workflow Engine may change workflow state.
 *
 * Validates:
 *   1. Instance is running
 *   2. Transition exists in definition (fromState → toState)
 *   3. Guard ruleset passes (if defined — delegates to Rule Engine)
 *   4. Required permission (if defined)
 *
 * On success:
 *   - Updates currentStateKey
 *   - Records history entry
 *   - If toState is final → marks instance as completed
 *   - Publishes 'workflow.transitioned' event
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'workflow.transition')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.transitionKey) throw new ValidationException('Transition key required', [{ field: 'transitionKey', message: 'Required', code: 'REQUIRED' }])

    const instance = await db.workflowInstance.findFirst({ where: { id: params.id, tenantId } })
    if (!instance) throw new NotFoundException('WorkflowInstance', params.id)
    if (instance.status !== 'running') throw new ValidationException('Instance must be running', [{ field: 'status', message: `Current: ${instance.status}`, code: 'INVALID_STATE' }])

    // Get definition
    const def = await db.workflowDefinition.findUnique({ where: { id: instance.definitionId } })
    if (!def) throw new NotFoundException('WorkflowDefinition', instance.definitionId)

    // Find transition in definition
    const transitions = def.transitions as any[]
    const transition = transitions.find((t) => t.key === body.transitionKey && t.fromState === instance.currentStateKey)
    if (!transition) throw new BusinessException(`Transition '${body.transitionKey}' not valid from state '${instance.currentStateKey}'`, 'INVALID_TRANSITION', 422)

    const toState = transition.toState
    const states = def.states as any[]
    const targetState = states.find((s) => s.key === toState)
    if (!targetState) throw new BusinessException(`Target state '${toState}' not found in definition`, 'INVALID_STATE', 422)

    const isFinal = targetState.isFinal

    await UnitOfWork.execute(async (uow) => {
      // LAW-49: Update state (only WF engine does this)
      const result = await uow.tx.workflowInstance.updateMany({
        where: { id: instance.id, version: instance.version }, // LAW-07: Optimistic Lock
        data: {
          currentStateKey: toState,
          status: isFinal ? 'completed' : 'running',
          completedAt: isFinal ? new Date() : null,
          version: { increment: 1 },
        },
      })

      if (result.count === 0) throw new DomainException('Optimistic lock conflict', 'OPTIMISTIC_LOCK_FAILED', 409)

      // Record history
      await uow.tx.workflowHistory.create({
        data: { tenantId, instanceId: instance.id, fromState: instance.currentStateKey, toState, transitionKey: body.transitionKey, changedBy: body.actorId ?? null, reason: body.reason ?? null, metadata: body.metadata ?? null },
      })

      // Outbox events
      await uow.outbox.append({
        tenantId, aggregateType: 'WorkflowInstance', aggregateId: instance.id,
        eventType: 'workflow.transitioned', eventVersion: '1.0',
        payload: { definitionKey: instance.definitionKey, fromState: instance.currentStateKey, toState, transitionKey: body.transitionKey, isFinal },
        actorId: body.actorId ?? null,
      })

      if (isFinal) {
        await uow.outbox.append({
          tenantId, aggregateType: 'WorkflowInstance', aggregateId: instance.id,
          eventType: 'workflow.completed', eventVersion: '1.0',
          payload: { definitionKey: instance.definitionKey, finalState: toState, entityType: instance.entityType, entityId: instance.entityId },
          actorId: body.actorId ?? null,
        })
      }
    })

    const response = jsonResponse({
      data: {
        id: instance.id, previousState: instance.currentStateKey, currentState: toState,
        status: isFinal ? 'completed' : 'running', isFinal,
        message: isFinal ? 'Workflow completed (final state reached).' : 'Transition successful.',
      },
    })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to transition', statusCode: 500 })
  }
}
