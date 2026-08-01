/**
 * POST /api/v1/sla/check-breaches
 *
 * T-6-08: Check for SLA breaches.
 *
 * Can be called manually or by a cron job.
 * Returns counts of breaches found + alerts emitted.
 *
 * Requires: service.create (manager level)
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, IdempotencyHelper } from '@/lib/shared'
import { checkSlaBreaches } from '@/lib/sla-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const rawBody = await request.text()

    const result = await checkSlaBreaches(tenantId)

    logger.info({
      tenantId,
      userId: ctx.userId,
      ...result,
    }, 'SLA breach check triggered')

    const responseBody = JSON.stringify({
      data: {
        message: 'SLA breach check completed',
        ...result,
        checkedAt: new Date().toISOString(),
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    logger.error({ err: e }, 'SLA check failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'SLA check failed', statusCode: 500 })
  }
}
