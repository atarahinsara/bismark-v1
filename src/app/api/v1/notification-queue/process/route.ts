import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, DomainException } from '@/lib/shared'
import { notificationService } from '@/lib/modules/notification'

/**
 * POST /api/v1/notification-queue/process
 *
 * Cron-style batch processor for ready queue items (LAW-57).
 *
 * Body: { batchSize?: number, workerId?: string }
 * Defaults: batchSize=10, workerId=`worker-${random}`
 *
 * Finds queue items WHERE inDeadLetter=false AND lockedBy IS NULL AND
 * nextRetryAt <= now, ORDER BY priority DESC, nextRetryAt ASC, LIMIT batchSize.
 * For each, calls notificationService.processQueueItem(item.id, workerId).
 *
 * Returns: { processed: number, results: [{ queueItemId, notificationId, status }] }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.send')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    // Read body once as text, then parse manually — see send/route.ts for rationale.
    const rawBody = await request.text()
    let body: any = {}
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      /* invalid JSON — keep {} */
    }

    const batchSize = Math.min(
      100,
      Math.max(1, Number(body.batchSize) || 10),
    )
    const workerId =
      typeof body.workerId === 'string' && body.workerId.length > 0
        ? body.workerId
        : `worker-${crypto.randomUUID()}`

    const now = new Date()

    // Pick ready items (not in DLQ, not locked, due now)
    const items = await db.notificationQueue.findMany({
      where: {
        tenantId,
        inDeadLetter: false,
        lockedBy: null,
        nextRetryAt: { lte: now },
      },
      orderBy: [{ priority: 'desc' }, { nextRetryAt: 'asc' }],
      take: batchSize,
      select: { id: true, notificationId: true },
    })

    const results: Array<{
      queueItemId: string
      notificationId: string
      status: string
      message?: string
    }> = []

    for (const item of items) {
      try {
        const r = await notificationService.processQueueItem(item.id, workerId)
        results.push({
          queueItemId: item.id,
          notificationId: item.notificationId,
          status: r.status,
          ...(r.message ? { message: r.message } : {}),
        })
      } catch (err: any) {
        results.push({
          queueItemId: item.id,
          notificationId: item.notificationId,
          status: 'error',
          message: err?.message ?? 'unknown_error',
        })
      }
    }

    const responseBody = JSON.stringify({
      data: {
        processed: results.length,
        batchSize,
        workerId,
        results,
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to process notification queue',
      statusCode: 500,
    })
  }
}
