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
    const context = url.searchParams.get('context')
    const status = url.searchParams.get('status')

    const where = { tenantId, deletedAt: null, ...(context ? { context } : {}), ...(status ? { status } : {}) }
    const [sets, total] = await Promise.all([
      db.ruleSet.findMany({ where, include: { _count: { select: { rules: true } } }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.ruleSet.count({ where }),
    ])
    return jsonResponse({ data: sets.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list rule sets', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.code) throw new ValidationException('Code is required', [{ field: 'code', message: 'Required', code: 'REQUIRED' }])
    if (!body.name) throw new ValidationException('Name is required', [{ field: 'name', message: 'Required', code: 'REQUIRED' }])
    if (!body.context) throw new ValidationException('Context is required', [{ field: 'context', message: 'Required', code: 'REQUIRED' }])

    const set = await db.ruleSet.create({
      data: {
        tenantId, code: body.code, name: body.name, context: body.context,
        status: 'draft', version: 1, priority: body.priority ?? 100,
        description: body.description ?? null, metadata: {},
      },
      include: { _count: { select: { rules: true } } },
    })

    const response = jsonResponse({ data: toDTO(set) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create rule set', statusCode: 500 })
  }
}

function toDTO(s: any) {
  return {
    id: s.id, code: s.code, name: s.name, context: s.context,
    status: s.status, version: s.version, priority: s.priority,
    effectiveFrom: s.effectiveFrom.toISOString(),
    effectiveTo: s.effectiveTo?.toISOString() ?? null,
    publishedAt: s.publishedAt?.toISOString() ?? null,
    description: s.description, ruleCount: s._count?.rules ?? 0,
  }
}
