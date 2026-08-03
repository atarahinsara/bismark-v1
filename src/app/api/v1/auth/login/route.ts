import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { login, AuthError } from '@/lib/auth'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException } from '@/lib/shared'
import { rateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limiter'

/**
 * POST /api/v1/auth/login
 *
 * Authenticates a user and returns JWT access + refresh tokens.
 * Rate limited: 5 attempts per IP per 60 seconds (RT-MED-004).
 *
 * Request body:
 *   { username: string, password: string }
 *
 * Response:
 *   200: { accessToken, refreshToken, expiresIn, user }
 *   401: Invalid credentials
 *   423: Account locked
 *   429: Rate limited
 *   403: Account disabled
 */
export async function POST(request: NextRequest) {
  try {
    // RT-MED-004: Rate limit BEFORE any DB access
    const ipAddress = getClientIP(request)
    const rateLimitResult = rateLimit('auth:login', ipAddress)
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult)
    }

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

    const userAgent = request.headers.get('user-agent') || undefined

    // T-2-17: Pass mfaToken if provided (for MFA-enabled users)
    const result = await login(body.username, body.password, ipAddress, userAgent, body.mfaToken)

    const responseBody = JSON.stringify({ data: result })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Authentication failed',
      statusCode: 500,
    })
  }
}
