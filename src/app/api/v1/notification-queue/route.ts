import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getTenantId,
  jsonResponse,
  errorResponse,
  parseQueryParams,
} from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/notification-queue
 *
 * List queue items with a derived `status` filter:
 *   dlq     → inDeadLetter=true
 *   ready   → inDeadLetter=false AND nextRetryAt <= now
 *   locked  → lockedBy IS NOT NULL
 *   pending → inDeadLetter=false AND lockedBy IS NULL
 *
 * Includes the notification (id, status, channel, recipientAddress, templateCode).
 * Order: priority DESC, nextRetryAt ASC.
 *
 * Query: page, per_page, status
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.send')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const now = new Date()

    const where: any = { tenantId }
    switch (statusFilter) {
      case 'dlq':
        where.inDeadLetter = true
        break
      case 'ready':
        where.inDeadLetter = false
        where.nextRetryAt = { lte: now }
        break
      case 'locked':
        where.lockedBy = { not: null }
        break
      case 'pending':
        where.inDeadLetter = false
        where.lockedBy = null
        break
      // undefined / 'all' → no filter
    }

    const [items, total] = await Promise.all([
      db.notificationQueue.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { nextRetryAt: 'asc' }],
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        include: {
          notification: {
            select: {
              id: true,
              status: true,
              channel: true,
              recipientAddress: true,
              templateCode: true,
            },
          },
        },
      }),
      db.notificationQueue.count({ where }),
    ])

    return jsonResponse({
      data: items.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total,
        last_page: Math.ceil(total / params.perPage) || 1,
        filter: statusFilter ?? 'all',
      },
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
      message: 'Failed to list notification queue',
      statusCode: 500,
    })
  }
}

function toDTO(q: any) {
  // Derive a computed status for the UI
  let computed: 'dlq' | 'ready' | 'locked' | 'pending'
  if (q.inDeadLetter) {
    computed = 'dlq'
  } else if (q.lockedBy) {
    computed = 'locked'
  } else {
    const nowMs = Date.now()
    const nextMs = q.nextRetryAt ? new Date(q.nextRetryAt).getTime() : 0
    computed = nextMs <= nowMs ? 'ready' : 'pending'
  }

  return {
    id: q.id,
    tenantId: q.tenantId,
    notificationId: q.notificationId,
    notification: q.notification
      ? {
          id: q.notification.id,
          status: q.notification.status,
          channel: q.notification.channel,
          recipientAddress: q.notification.recipientAddress,
          templateCode: q.notification.templateCode,
        }
      : null,
    priority: q.priority,
    attempt: q.attempt,
    maxAttempts: q.maxAttempts,
    nextRetryAt: q.nextRetryAt.toISOString(),
    inDeadLetter: q.inDeadLetter,
    deadLetterAt: q.deadLetterAt?.toISOString() ?? null,
    deadLetterReason: q.deadLetterReason,
    lockedBy: q.lockedBy,
    lockedAt: q.lockedAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    status: computed,
  }
}
