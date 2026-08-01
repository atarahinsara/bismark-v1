import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/tax-rules
 * List tax rules (LAW-45: with effective date range).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const isActive = url.searchParams.get('is_active')

    const where = {
      tenantId, deletedAt: null,
      ...(isActive ? { isActive: isActive === 'true' } : {}),
    }

    const [rules, total] = await Promise.all([
      db.taxRule.findMany({
        where, include: { taxCode: true },
        orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
        skip: (params.page - 1) * params.perPage, take: params.perPage,
      }),
      db.taxRule.count({ where }),
    ])

    return jsonResponse({
      data: rules.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list tax rules', statusCode: 500 })
  }
}

/**
 * POST /api/v1/tax-rules
 * Create a new tax rule (LAW-45: versioned + effective-dated).
 * Idempotent (LAW-06).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.taxCodeId) throw new ValidationException('Tax code is required', [{ field: 'taxCodeId', message: 'Required', code: 'REQUIRED' }])
    if (!body.name) throw new ValidationException('Name is required', [{ field: 'name', message: 'Required', code: 'REQUIRED' }])

    const taxCode = await db.taxCode.findFirst({ where: { id: body.taxCodeId, tenantId, isActive: true } })
    if (!taxCode) throw new NotFoundException('TaxCode', body.taxCodeId)

    const rule = await db.taxRule.create({
      data: {
        tenantId,
        taxCodeId: body.taxCodeId,
        name: body.name,
        productCategoryId: body.productCategoryId ?? null,
        customerGroupId: body.customerGroupId ?? null,
        regionId: body.regionId ?? null,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        priority: body.priority ?? 100,
        formula: body.formula ?? 'rate * taxableAmount',
        rateOverride: body.rateOverride ?? null,
        isReverseCharge: body.isReverseCharge ?? false,
        isActive: true,
        description: body.description ?? null,
        metadata: {},
      },
      include: { taxCode: true },
    })

    await db.outboxMessage.create({
      data: {
        tenantId, aggregateType: 'TaxRule', aggregateId: rule.id,
        eventType: 'tax.rule.changed', eventVersion: '1.0',
        payload: { ruleId: rule.id, name: rule.name, taxCodeId: body.taxCodeId, effectiveFrom: rule.effectiveFrom.toISOString() },
        actorId: null,
      },
    })

    const response = jsonResponse({ data: toDTO(rule) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create tax rule', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id, name: r.name,
    taxCodeId: r.taxCodeId, taxCode: r.taxCode ? { code: r.taxCode.code, name: r.taxCode.name, ratePercent: r.taxCode.ratePercent, taxType: r.taxCode.taxType } : null,
    productCategoryId: r.productCategoryId,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo?.toISOString() ?? null,
    priority: r.priority, formula: r.formula, rateOverride: r.rateOverride,
    isReverseCharge: r.isReverseCharge, isActive: r.isActive, version: r.version,
    description: r.description,
  }
}
