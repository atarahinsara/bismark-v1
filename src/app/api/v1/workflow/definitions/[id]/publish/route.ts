import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/workflow/definitions/{id}/publish
 * Publish a draft workflow definition (activates it).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'workflow.manage')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const def = await db.workflowDefinition.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!def) throw new NotFoundException('WorkflowDefinition', params.id)
    if (def.isActive) throw new ValidationException('Already published', [{ field: 'isActive', message: 'Already active', code: 'INVALID_STATE' }])

    // Deactivate previous version if exists
    await db.workflowDefinition.updateMany({
      where: { tenantId, key: def.key, isActive: true },
      data: { isActive: false },
    })

    await db.workflowDefinition.update({ where: { id: params.id }, data: { isActive: true, publishedAt: new Date() } })

    await db.outboxMessage.create({
      data: { tenantId, aggregateType: 'WorkflowDefinition', aggregateId: params.id, eventType: 'workflow.published', eventVersion: '1.0', payload: { key: def.key, version: def.version }, actorId: null, occurredAt: new Date(), status: 'pending' },
    })

    const response = jsonResponse({ data: { id: params.id, status: 'published', message: 'Workflow definition published and activated.' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to publish', statusCode: 500 })
  }
}
