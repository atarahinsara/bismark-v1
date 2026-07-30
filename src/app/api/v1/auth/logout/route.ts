import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { logout, getAuthContext, AuthError } from '@/lib/auth'
import { IdempotencyHelper } from '@/lib/shared'

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the current session.
 * Requires: Bearer token (authenticated)
 *
 * Response:
 *   200: { message: "Logged out successfully" }
 *   401: Not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const authCtx = getAuthContext(request)
    if (!authCtx) {
      return errorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        statusCode: 401,
      })
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]

    if (token) {
      await logout(token)
    }

    const responseBody = JSON.stringify({ data: { message: 'Logged out successfully' } })
    await IdempotencyHelper.store(request, responseBody, 200, '{}')

    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    console.error('[auth/logout] error:', e)
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Logout failed',
      statusCode: 500,
    })
  }
}
