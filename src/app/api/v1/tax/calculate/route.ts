import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * POST /api/v1/tax/calculate
 * LAW-43: Tax Is Always Derived From Tax Rules.
 *
 * Input: { taxableAmount, taxCodeId, productCategoryId?, date? }
 * Output: { taxBase, taxRate, taxAmount, ruleUsed, taxCode }
 *
 * Finds the effective TaxRule for the given date and context,
 * calculates the tax amount, and returns the result (without posting).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.read')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.taxableAmount || body.taxableAmount <= 0) throw new ValidationException('Taxable amount must be positive', [{ field: 'taxableAmount', message: 'Must be > 0', code: 'INVALID' }])
    if (!body.taxCodeId) throw new ValidationException('Tax code is required', [{ field: 'taxCodeId', message: 'Required', code: 'REQUIRED' }])

    const calcDate = body.date ? new Date(body.date) : new Date()

    // Find the tax code
    const taxCode = await db.taxCode.findFirst({ where: { id: body.taxCodeId, tenantId, isActive: true } })
    if (!taxCode) throw new NotFoundException('TaxCode', body.taxCodeId)

    // LAW-45: Find the effective TaxRule for this date
    const rules = await db.taxRule.findMany({
      where: {
        tenantId,
        taxCodeId: body.taxCodeId,
        isActive: true,
        deletedAt: null,
        effectiveFrom: { lte: calcDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: calcDate } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
    })

    // Filter by product category if specified
    let effectiveRule = rules.find((r) => r.productCategoryId === body.productCategoryId)
    if (!effectiveRule) effectiveRule = rules.find((r) => r.productCategoryId === null) // generic rule
    if (!effectiveRule && rules.length > 0) effectiveRule = rules[0] // fallback to first

    if (!effectiveRule) {
      // No rule found — use TaxCode default rate
      const taxRate = taxCode.ratePercent / 100
      const taxAmount = body.taxableAmount * taxRate

      const response = jsonResponse({
        data: {
          taxBase: body.taxableAmount,
          taxRate: taxCode.ratePercent,
          taxAmount,
          taxCode: { id: taxCode.id, code: taxCode.code, name: taxCode.name, taxType: taxCode.taxType },
          ruleUsed: null,
          message: 'No specific tax rule found — using TaxCode default rate.',
        },
      })
      await IdempotencyHelper.store(request, await response.clone().text(), 200)
      return response
    }

    // LAW-43: Calculate tax using the effective rule
    const effectiveRate = effectiveRule.rateOverride ?? taxCode.ratePercent
    const taxRate = effectiveRate / 100
    const taxAmount = body.taxableAmount * taxRate

    const response = jsonResponse({
      data: {
        taxBase: body.taxableAmount,
        taxRate: effectiveRate,
        taxAmount,
        taxCode: { id: taxCode.id, code: taxCode.code, name: taxCode.name, taxType: taxCode.taxType, isRecoverable: taxCode.isRecoverable },
        ruleUsed: {
          id: effectiveRule.id,
          name: effectiveRule.name,
          priority: effectiveRule.priority,
          formula: effectiveRule.formula,
          rateOverride: effectiveRule.rateOverride,
          effectiveFrom: effectiveRule.effectiveFrom.toISOString(),
          effectiveTo: effectiveRule.effectiveTo?.toISOString() ?? null,
        },
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to calculate tax', statusCode: 500 })
  }
}
