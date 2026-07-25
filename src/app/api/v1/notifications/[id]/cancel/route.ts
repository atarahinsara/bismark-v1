import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, DomainException, ValidationException } from '@/lib/shared'
import { notificationService } from '@/lib/modules/notification'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/notifications/{id}/cancel
 *
 * Cancel a notification that hasn't reached a terminal state (LAW-57).
 *
 * Body: { reason, cancelledBy }
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id } = await params
    // Read body once as text, then parse manually — see send/route.ts for rationale.
    const rawBody = await request.text()
    let body: any = {}
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      /* invalid JSON — keep {} */
    }

    if (!body.cancelledBy)
      throw new ValidationException('cancelledBy is required', [
        { field: 'cancelledBy', message: 'Required', code: 'REQUIRED' },
      ])
    if (!body.reason)
      throw new ValidationException('reason is required', [
        { field: 'reason', message: 'Required', code: 'REQUIRED' },
      ])

    await notificationService.cancel(id, body.cancelledBy, body.reason)

    const responseBody = JSON.stringify({
      data: {
        id,
        status: 'cancelled',
        message: 'Notification cancelled. Queue items moved to DLQ.',
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
      message: 'Failed to cancel notification',
      statusCode: 500,
    })
  }
}
