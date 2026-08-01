import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/workflow/definitions
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'workflow.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const where = { tenantId, deletedAt: null }
    const [defs, total] = await Promise.all([
      db.workflowDefinition.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.workflowDefinition.count({ where }),
    ])
    return jsonResponse({ data: defs.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list workflow definitions', statusCode: 500 })
  }
}

/**
 * POST /api/v1/workflow/definitions
 * Create a new workflow definition with states and transitions.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'workflow.read')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.key) throw new ValidationException('Key is required', [{ field: 'key', message: 'Required', code: 'REQUIRED' }])
    if (!body.name) throw new ValidationException('Name is required', [{ field: 'name', message: 'Required', code: 'REQUIRED' }])
    if (!body.entityType) throw new ValidationException('Entity type is required', [{ field: 'entityType', message: 'Required', code: 'REQUIRED' }])
    if (!body.states || !Array.isArray(body.states) || body.states.length === 0) throw new ValidationException('At least one state required', [{ field: 'states', message: 'Required', code: 'REQUIRED' }])

    // Validate states: exactly one initial, at least one final
    const initialStates = body.states.filter((s: any) => s.isInitial)
    const finalStates = body.states.filter((s: any) => s.isFinal)
    if (initialStates.length !== 1) throw new ValidationException('Exactly one initial state required', [{ field: 'states', message: 'One initial', code: 'INVALID' }])
    if (finalStates.length === 0) throw new ValidationException('At least one final state required', [{ field: 'states', message: 'One final', code: 'INVALID' }])

    // Check no cycles in transitions (simplified: just check from ≠ to)
    if (body.transitions) {
      for (const t of body.transitions) {
        if (t.fromState === t.toState) throw new ValidationException(`Transition ${t.key}: from ≠ to`, [{ field: 'transitions', message: 'Self-transition', code: 'INVALID' }])
      }
    }

    const def = await db.workflowDefinition.create({
      data: {
        tenantId, key: body.key, name: body.name, entityType: body.entityType,
        version: 1, isActive: false, // draft until published
        states: body.states, transitions: body.transitions ?? [],
        description: body.description ?? null, metadata: {},
      },
    })

    const responseBody = JSON.stringify({ data: toDTO(def) })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create workflow definition', statusCode: 500 })
  }
}

function toDTO(d: any) {
  return {
    id: d.id, key: d.key, name: d.name, entityType: d.entityType,
    version: d.version, isActive: d.isActive, publishedAt: d.publishedAt?.toISOString() ?? null,
    states: d.states, transitions: d.transitions,
    description: d.description,
  }
}