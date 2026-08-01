import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/fiscal-periods/{id}/soft-close
 * Soft close — temporarily locks the period for review.
 * Can be reopened.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.period_close')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const period = await db.fiscalPeriod.findFirst({ where: { id: params.id, tenantId } })
    if (!period) throw new NotFoundException('FiscalPeriod', params.id)
    if (period.status !== 'open') throw new ValidationException('Period must be open to soft close', [{ field: 'status', message: `Current: ${period.status}`, code: 'INVALID_STATE' }])

    await db.fiscalPeriod.update({ where: { id: params.id }, data: { status: 'temporarily_closed' } })

    const response = jsonResponse({ data: { id: params.id, status: 'temporarily_closed', message: 'Period soft-closed. Can be reopened.' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, "{}")
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to soft close', statusCode: 500 })
  }
}
