import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/rule-sets/{id}/publish
 * Publish a draft rule set (LAW-50: versioned).
 * Deactivates previous published version of the same code.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'rule.manage')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const set = await db.ruleSet.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!set) throw new NotFoundException('RuleSet', params.id)
    if (set.status === 'published') throw new ValidationException('Already published', [{ field: 'status', message: 'Already published', code: 'INVALID_STATE' }])

    // Deactivate previous published version
    await db.ruleSet.updateMany({
      where: { tenantId, code: set.code, status: 'published' },
      data: { status: 'disabled', effectiveTo: new Date() },
    })

    await db.ruleSet.update({ where: { id: params.id }, data: { status: 'published', publishedAt: new Date() } })

    await db.outboxMessage.create({
      data: { tenantId, aggregateType: 'RuleSet', aggregateId: params.id, eventType: 'rule.published', eventVersion: '1.0', payload: { code: set.code, version: set.version }, actorId: null, occurredAt: new Date(), status: 'pending' },
    })

    const response = jsonResponse({ data: { id: params.id, status: 'published', message: 'Rule set published. Previous version disabled.' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, "{}")
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to publish', statusCode: 500 })
  }
}
