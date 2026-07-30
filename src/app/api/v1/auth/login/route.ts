import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { login, AuthError } from '@/lib/auth'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException } from '@/lib/shared'

/**
 * POST /api/v1/auth/login
 *
 * Authenticates a user and returns JWT access + refresh tokens.
 *
 * Request body:
 *   { username: string, password: string }
 *
 * Response:
 *   200: { accessToken, refreshToken, expiresIn, user }
 *   401: Invalid credentials
 *   423: Account locked
 *   403: Account disabled
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    if (!body.username || typeof body.username !== 'string') {
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Username is required',
        statusCode: 400,
      })
    }
    if (!body.password || typeof body.password !== 'string') {
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Password is required',
        statusCode: 400,
      })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    const result = await login(body.username, body.password, ipAddress, userAgent)

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
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    console.error('[auth/login] error:', e)
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Authentication failed',
      statusCode: 500,
    })
  }
}
