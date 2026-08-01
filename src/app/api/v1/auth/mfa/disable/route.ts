/**
 * POST /api/v1/auth/mfa/disable
 *
 * Disable MFA for the authenticated user.
 * Body: { password: "current_password" }
 *
 * Requires password re-confirmation for security.
 *
 * T-2-17: MFA disable.
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException } from '@/lib/shared'
import { verifyPassword } from '@/lib/auth/password'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    const body = await request.json()
    const password = String(body.password || '')

    if (!password) {
      throw new ValidationException('Password required', [
        { field: 'password', message: 'Required', code: 'REQUIRED' },
      ])
    }

    const user = await db.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, passwordHash: true, mfaEnabled: true },
    })

    if (!user) {
      return errorResponse({ code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 })
    }

    if (!user.mfaEnabled) {
      return errorResponse({ code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled', statusCode: 400 })
    }

    // Verify password
    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return errorResponse({ code: 'INVALID_PASSWORD', message: 'Password incorrect', statusCode: 401 })
    }

    // Disable MFA
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
      },
    })

    logger.info({ userId: ctx.userId, action: 'mfa_disabled' }, 'MFA disabled')

    return jsonResponse({
      data: {
        message: 'MFA disabled. Account is now less secure.',
        enabled: false,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'MFA disable failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'MFA disable failed', statusCode: 500 })
  }
}
