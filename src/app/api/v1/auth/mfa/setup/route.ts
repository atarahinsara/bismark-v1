/**
 * POST /api/v1/auth/mfa/setup
 *
 * Initialize MFA for the authenticated user.
 * Returns: secret + otpauth URI + backup codes.
 *
 * User must scan QR code and verify with POST /auth/mfa/verify to complete setup.
 *
 * T-2-17: MFA for admin/finance roles.
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, unauthorizedResponse } from '@/lib/rbac'
import { DomainException } from '@/lib/shared'
import { generateMfaSecret, generateOtpAuthUri, generateBackupCodes, hashBackupCode } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'

// Roles that require MFA
const MFA_REQUIRED_ROLES = ['super_admin', 'ceo', 'financial_manager', 'it_administrator']

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()

    // Check if user already has MFA enabled
    const user = await db.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) {
      return errorResponse({ code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 })
    }

    if (user.mfaEnabled) {
      return errorResponse({ code: 'MFA_ALREADY_ENABLED', message: 'MFA is already enabled. Disable first to reconfigure.', statusCode: 409 })
    }

    // Generate new secret + backup codes
    const secret = generateMfaSecret()
    const otpAuthUri = generateOtpAuthUri(user.email || ctx.username, secret)
    const backupCodesPlain = generateBackupCodes()
    const backupCodesHashed = await Promise.all(backupCodesPlain.map(hashBackupCode))

    // Store secret temporarily (not enabled yet — verify step activates it)
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        mfaSecret: secret,
        mfaBackupCodes: backupCodesHashed,
      },
    })

    logger.info({ userId: ctx.userId, action: 'mfa_setup_initiated' }, 'MFA setup initiated')

    return jsonResponse({
      data: {
        secret,
        otpAuthUri,
        backupCodes: backupCodesPlain, // Show once — user must save
        message: 'Scan QR code with authenticator app, then verify with POST /auth/mfa/verify',
      },
    })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    }
    logger.error({ err: e }, 'MFA setup failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'MFA setup failed', statusCode: 500 })
  }
}
