import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import { refresh, AuthError } from '@/lib/auth'
import { IdempotencyHelper } from '@/lib/shared'
import { rateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limiter'

/**
 * POST /api/v1/auth/refresh
 *
 * Exchanges a refresh token for a new access token + refresh token.
 * Implements refresh token rotation (old refresh token is invalidated).
 * Rate limited: 10 attempts per IP per 60 seconds (RT-MED-004).
 *
 * Request body:
 *   { refreshToken: string }
 *
 * Response:
 *   200: { accessToken, refreshToken, expiresIn }
 *   401: Invalid/expired refresh token
 *   429: Rate limited
 */
export async function POST(request: NextRequest) {
  try {
    // RT-MED-004: Rate limit BEFORE any DB access
    const ipAddress = getClientIP(request)
    const rateLimitResult = rateLimit('auth:refresh', ipAddress)
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult)
    }

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    if (!body.refreshToken || typeof body.refreshToken !== 'string') {
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'refreshToken is required',
        statusCode: 400,
      })
    }

    const result = await refresh(body.refreshToken)

    const responseBody = JSON.stringify({ data: result })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)

    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    console.error('[auth/refresh] error:', e)
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Token refresh failed',
      statusCode: 500,
    })
  }
}
