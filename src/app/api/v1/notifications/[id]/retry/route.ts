import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, DomainException, ValidationException } from '@/lib/shared'
import { notificationService } from '@/lib/modules/notification'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/notifications/{id}/retry
 *
 * Manually retry a failed / DLQ'd notification (LAW-57).
 * The service will:
 *   - throw NOTIFICATION_TERMINAL if the notification is sent/cancelled
 *   - reset the queue item to attempt=0, nextRetryAt=now, inDeadLetter=false
 *   - move the notification back to 'queued'
 *   - publish 'notification.retried' outbox event
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id } = await params
    // Read body once as text for idempotency hashing — see send/route.ts for rationale.
    const rawBody = await request.text().catch(() => '')

    await notificationService.retry(id)

    const responseBody = JSON.stringify({
      data: {
        id,
        status: 'queued',
        message: 'Notification retry scheduled. Queue item reset to attempt 0.',
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
        errors: (e as ValidationException).errors,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retry notification',
      statusCode: 500,
    })
  }
}
