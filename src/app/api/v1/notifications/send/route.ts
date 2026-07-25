import { NextRequest } from 'next/server'
import {
  getTenantId,
  jsonResponse,
  errorResponse,
} from '@/lib/api-helpers'
import { IdempotencyHelper, DomainException, ValidationException } from '@/lib/shared'
import {
  notificationService,
  type Channel,
  type DispatchInput,
} from '@/lib/modules/notification'

/**
 * POST /api/v1/notifications/send
 *
 * Dispatch a new notification (LAW-55/56/57).
 *
 * Body: {
 *   templateCode, channel?, language?, recipientId?, recipientName?,
 *   recipientAddress, variables, priority?, triggeredByEvent?,
 *   idempotencyKey?   // optional — derived deterministically if absent
 * }
 *
 * Returns 201 if created, 200 if idempotent hit.
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    // Read body once as text, then parse manually (so IdempotencyHelper.store
    // can re-hash the body string without re-cloning the request stream —
    // request.clone().text() throws "TypeError: unusable" after request.json()
    // has consumed the body in some runtimes).
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    // Required fields
    const errors: Array<{ field: string; message: string; code: string }> = []
    if (!body.templateCode)
      errors.push({
        field: 'templateCode',
        message: 'Required',
        code: 'REQUIRED',
      })
    if (!body.recipientAddress)
      errors.push({
        field: 'recipientAddress',
        message: 'Required',
        code: 'REQUIRED',
      })
    if (body.variables === undefined || body.variables === null)
      errors.push({
        field: 'variables',
        message: 'Required',
        code: 'REQUIRED',
      })
    if (errors.length > 0)
      throw new ValidationException('Validation failed', errors)

    // Compute idempotencyKey
    let idempotencyKey: string
    if (body.idempotencyKey && typeof body.idempotencyKey === 'string') {
      idempotencyKey = body.idempotencyKey
    } else {
      // Derive deterministically (LAW-57)
      const recipient = body.recipientId ?? body.recipientAddress
      const trigger = body.triggeredByEvent ?? 'manual'
      idempotencyKey = `${body.templateCode}#${recipient}#${trigger}#${JSON.stringify(
        body.variables,
      )}`
    }

    const dispatchInput: DispatchInput = {
      templateCode: body.templateCode,
      recipientAddress: body.recipientAddress,
      variables: body.variables,
      idempotencyKey,
      ...(body.channel ? { channel: body.channel as Channel } : {}),
      ...(body.language ? { language: body.language } : {}),
      ...(body.recipientId ? { recipientId: body.recipientId } : {}),
      ...(body.recipientName ? { recipientName: body.recipientName } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.triggeredByEvent
        ? { triggeredByEvent: body.triggeredByEvent }
        : {}),
    }

    const result = await notificationService.dispatch(dispatchInput)

    const status = result.created ? 201 : 200
    const responseBody = JSON.stringify({ data: result })
    await IdempotencyHelper.store(request, responseBody, status, rawBody)
    return new Response(responseBody, {
      status,
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
    console.error('[notification/send] failed:', e)
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to dispatch notification',
      statusCode: 500,
    })
  }
}
