import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import { refresh, AuthError } from '@/lib/auth'
import { IdempotencyHelper } from '@/lib/shared'

/**
 * POST /api/v1/auth/refresh
 *
 * Exchanges a refresh token for a new access token + refresh token.
 * Implements refresh token rotation (old refresh token is invalidated).
 *
 * Request body:
 *   { refreshToken: string }
 *
 * Response:
 *   200: { accessToken, refreshToken, expiresIn }
 *   401: Invalid/expired refresh token
 */
export async function POST(request: NextRequest) {
  try {
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
