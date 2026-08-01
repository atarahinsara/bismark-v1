/**
 * POST /api/v1/auth/mfa/verify
 *
 * Verify a TOTP code and activate MFA for the user.
 * Body: { token: "123456" }
 *
 * After successful verification, MFA is enabled — user must provide TOTP on next login.
 *
 * T-2-17: MFA verification.
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException } from '@/lib/shared'
import { verifyMfaToken } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const body = await request.json()
    const token = String(body.token || '').replace(/\s/g, '')

    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      throw new ValidationException('Invalid TOTP token format', [
        { field: 'token', message: 'Token must be 6 digits', code: 'INVALID_FORMAT' },
      ])
    }

    const user = await db.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) {
      return errorResponse({ code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 })
    }

    if (user.mfaEnabled) {
      return errorResponse({ code: 'MFA_ALREADY_ENABLED', message: 'MFA already enabled', statusCode: 409 })
    }

    if (!user.mfaSecret) {
      return errorResponse({ code: 'MFA_NOT_SETUP', message: 'Call POST /auth/mfa/setup first', statusCode: 400 })
    }

    const valid = verifyMfaToken(user.mfaSecret, token)
    if (!valid) {
      logger.warn({ userId: ctx.userId }, 'MFA verification failed — invalid token')
      return errorResponse({ code: 'MFA_TOKEN_INVALID', message: 'Invalid TOTP token', statusCode: 401 })
    }

    // Activate MFA
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        mfaEnabled: true,
        mfaSetupAt: new Date(),
        lastMfaAt: new Date(),
      },
    })

    logger.info({ userId: ctx.userId, action: 'mfa_enabled' }, 'MFA enabled successfully')

    return jsonResponse({
      data: {
        message: 'MFA enabled successfully. You will need to provide a TOTP code on next login.',
        enabled: true,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'MFA verify failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'MFA verification failed', statusCode: 500 })
  }
}
