import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const ruleSetId = url.searchParams.get('rule_set_id')

    const where = { tenantId, deletedAt: null, ...(ruleSetId ? { ruleSetId } : {}) }
    const [rules, total] = await Promise.all([
      db.ruleDefinition.findMany({ where, include: { ruleSet: { select: { code: true, name: true, version: true } } }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.ruleDefinition.count({ where }),
    ])
    return jsonResponse({ data: rules.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list rules', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.ruleSetId) throw new ValidationException('Rule set ID required', [{ field: 'ruleSetId', message: 'Required', code: 'REQUIRED' }])
    if (!body.name) throw new ValidationException('Name required', [{ field: 'name', message: 'Required', code: 'REQUIRED' }])
    if (!body.conditionDsl) throw new ValidationException('Condition DSL required', [{ field: 'conditionDsl', message: 'Required', code: 'REQUIRED' }])
    if (!body.actionDsl) throw new ValidationException('Action DSL required', [{ field: 'actionDsl', message: 'Required', code: 'REQUIRED' }])

    const set = await db.ruleSet.findFirst({ where: { id: body.ruleSetId, tenantId, deletedAt: null } })
    if (!set) throw new NotFoundException('RuleSet', body.ruleSetId)

    // Validate action DSL type
    const validActions = ['allow', 'deny', 'requireApproval', 'notify', 'escalate', 'autoApprove']
    const actionType = (body.actionDsl as any)?.type
    if (!validActions.includes(actionType)) throw new ValidationException(`Invalid action type: ${validActions.join(', ')}`, [{ field: 'actionDsl.type', message: 'Invalid', code: 'INVALID' }])

    const rule = await db.ruleDefinition.create({
      data: {
        tenantId, ruleSetId: body.ruleSetId, name: body.name,
        description: body.description ?? null,
        conditionDsl: body.conditionDsl, actionDsl: body.actionDsl,
        priority: body.priority ?? 100, enabled: true, version: 1,
      },
      include: { ruleSet: { select: { code: true, name: true, version: true } } },
    })

    const response = jsonResponse({ data: toDTO(rule) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create rule', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id, ruleSetId: r.ruleSetId,
    ruleSet: r.ruleSet ? { code: r.ruleSet.code, name: r.ruleSet.name, version: r.ruleSet.version } : null,
    name: r.name, description: r.description,
    conditionDsl: r.conditionDsl, actionDsl: r.actionDsl,
    priority: r.priority, enabled: r.enabled, version: r.version,
  }
}
