import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/workflow/instances
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'workflow.transition')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const entityType = url.searchParams.get('entity_type')

    const where = { tenantId, ...(status ? { status } : {}), ...(entityType ? { entityType } : {}) }
    const [instances, total] = await Promise.all([
      db.workflowInstance.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.workflowInstance.count({ where }),
    ])
    return jsonResponse({ data: instances.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list instances', statusCode: 500 })
  }
}

/**
 * POST /api/v1/workflow/instances
 * LAW-49: Start a new workflow instance (only WF engine creates instances).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'workflow.transition')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.definitionKey) throw new ValidationException('Definition key required', [{ field: 'definitionKey', message: 'Required', code: 'REQUIRED' }])
    if (!body.entityType || !body.entityId) throw new ValidationException('Entity type and ID required', [{ field: 'entityType', message: 'Required', code: 'REQUIRED' }])

    // Find active definition
    const def = await db.workflowDefinition.findFirst({
      where: { tenantId, key: body.definitionKey, isActive: true, deletedAt: null },
    })
    if (!def) throw new NotFoundException('WorkflowDefinition (active)', body.definitionKey)

    // Find initial state
    const states = def.states as any[]
    const initialState = states.find((s) => s.isInitial)
    if (!initialState) throw new ValidationException('No initial state in definition', [{ field: 'states', message: 'No initial', code: 'INVALID' }])

    // Check if entity already has a running instance
    const existing = await db.workflowInstance.findFirst({
      where: { tenantId, entityType: body.entityType, entityId: body.entityId, status: 'running' },
    })
    if (existing) throw new ValidationException('Entity already has a running workflow', [{ field: 'entityId', message: 'Already running', code: 'DUPLICATE' }])

    const instance = await UnitOfWork.execute(async (uow) => {
      const inst = await uow.tx.workflowInstance.create({
        data: {
          tenantId, definitionId: def.id, definitionKey: def.key, definitionVersion: def.version,
          entityType: body.entityType, entityId: body.entityId,
          currentStateKey: initialState.key, status: 'running',
          startedBy: body.startedBy ?? null, metadata: {},
        },
      })

      // Record initial state in history
      await uow.tx.workflowHistory.create({
        data: { tenantId, instanceId: inst.id, fromState: null, toState: initialState.key, transitionKey: null, changedBy: body.startedBy ?? null, reason: 'Workflow started' },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'WorkflowInstance', aggregateId: inst.id,
        eventType: 'workflow.started', eventVersion: '1.0',
        payload: { definitionKey: def.key, entityType: body.entityType, entityId: body.entityId, initialState: initialState.key },
        actorId: body.startedBy ?? null,
      })

      return inst
    })

    const responseBody = JSON.stringify({ data: toDTO(instance) })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to start workflow', statusCode: 500 })
  }
}

function toDTO(i: any) {
  return {
    id: i.id, definitionKey: i.definitionKey, definitionVersion: i.definitionVersion,
    entityType: i.entityType, entityId: i.entityId,
    currentStateKey: i.currentStateKey, status: i.status,
    startedBy: i.startedBy, startedAt: i.startedAt.toISOString(),
    completedAt: i.completedAt?.toISOString() ?? null,
    version: i.version,
  }
}