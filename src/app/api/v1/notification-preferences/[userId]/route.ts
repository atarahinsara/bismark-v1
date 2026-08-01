import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import {
  IdempotencyHelper,
  DomainException,
  ValidationException,
} from '@/lib/shared'
import {
  preferenceService,
  type PreferenceUpdateInput,
} from '@/lib/modules/notification'

interface RouteCtx {
  params: Promise<{ userId: string }>
}

/**
 * GET /api/v1/notification-preferences/{userId}
 *
 * Get-or-create preference for a user (LAW-56).
 */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.read')

    const tenantId = await getTenantId()
    const { userId } = await params

    const pref = await preferenceService.getOrCreate(tenantId, userId)
    return jsonResponse({ data: toDTO(pref) })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch preference',
      statusCode: 500,
    })
  }
}

/**
 * PUT /api/v1/notification-preferences/{userId}
 *
 * Update a user's preferences (LAW-56). Body may contain any subset of:
 *   { emailEnabled, smsEnabled, pushEnabled, whatsappEnabled, inappEnabled,
 *     language, quietHoursStart?, quietHoursEnd? }
 */
export async function PUT(request: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.manage')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const { userId } = await params
    // Read body once as text, then parse manually — see send/route.ts for rationale.
    const rawBody = await request.text()
    let body: any = {}
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      /* invalid JSON — keep {} */
    }

    const ALLOWED_LANGUAGES = ['fa', 'en', 'ar', 'ku']
    if (body.language !== undefined && !ALLOWED_LANGUAGES.includes(body.language))
      throw new ValidationException(
        `Invalid language: ${body.language}. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`,
        [
          {
            field: 'language',
            message: `Must be one of: ${ALLOWED_LANGUAGES.join(', ')}`,
            code: 'INVALID',
          },
        ],
      )

    // Whitelist allowed keys — ignore anything else in the body
    const input: PreferenceUpdateInput = {}
    if (typeof body.emailEnabled === 'boolean')
      input.emailEnabled = body.emailEnabled
    if (typeof body.smsEnabled === 'boolean')
      input.smsEnabled = body.smsEnabled
    if (typeof body.pushEnabled === 'boolean')
      input.pushEnabled = body.pushEnabled
    if (typeof body.whatsappEnabled === 'boolean')
      input.whatsappEnabled = body.whatsappEnabled
    if (typeof body.inappEnabled === 'boolean')
      input.inappEnabled = body.inappEnabled
    if (typeof body.language === 'string') input.language = body.language
    if ('quietHoursStart' in body)
      input.quietHoursStart =
        typeof body.quietHoursStart === 'string' || body.quietHoursStart === null
          ? body.quietHoursStart
          : null
    if ('quietHoursEnd' in body)
      input.quietHoursEnd =
        typeof body.quietHoursEnd === 'string' || body.quietHoursEnd === null
          ? body.quietHoursEnd
          : null

    const updated = await preferenceService.update(tenantId, userId, input)

    const responseBody = JSON.stringify({ data: toDTO(updated) })
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
      message: 'Failed to update preference',
      statusCode: 500,
    })
  }
}

function toDTO(p: any) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    userId: p.userId,
    emailEnabled: p.emailEnabled,
    smsEnabled: p.smsEnabled,
    pushEnabled: p.pushEnabled,
    whatsappEnabled: p.whatsappEnabled,
    inappEnabled: p.inappEnabled,
    language: p.language,
    quietHoursStart: p.quietHoursStart,
    quietHoursEnd: p.quietHoursEnd,
    metadata: p.metadata,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
