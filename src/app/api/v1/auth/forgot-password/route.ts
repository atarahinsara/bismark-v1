import { NextRequest, NextResponse } from 'next/server'
import { AuthExtensionError, requestPasswordReset } from '@/lib/auth/auth-extensions'
import { sendPasswordResetEmail } from '@/lib/email/email-service'
import { isCaptchaRequired, verifyCaptcha } from '@/lib/captcha/captcha-service'
import { getTenantId } from '@/lib/api-helpers'
import { getClientIP } from '@/lib/rate-limiter'

// Always return the same message regardless of whether the email exists,
// to avoid user-enumeration via this endpoint.
const GENERIC_MESSAGE = 'If the email exists, a reset link has been sent'

/**
 * POST /api/v1/auth/forgot-password
 *
 * Request a password reset link.
 *
 * Request body:
 *   { email: string, captchaToken?: string }
 *
 * Response:
 *   200: { message }   (always the same generic message)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json({ error: 'Email is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    // --- Captcha (if enabled for the forgot-password form) ---
    if (await isCaptchaRequired('forgot-password')) {
      const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : ''
      const ip = getClientIP(req)
      const captchaResult = await verifyCaptcha(captchaToken, ip)
      if (!captchaResult.success) {
        return NextResponse.json(
          { error: captchaResult.error || 'Captcha verification failed', code: 'CAPTCHA_FAILED' },
          { status: 400 },
        )
      }
    }

    const tenantId = await getTenantId()
    const ipAddress = getClientIP(req)
    const normalizedEmail = body.email.trim().toLowerCase()

    const result = await requestPasswordReset(normalizedEmail, tenantId, ipAddress)

    // Only send the email if the user actually existed (token is non-null).
    if (result.token && result.userId) {
      const baseUrl = new URL(req.url).origin
      try {
        await sendPasswordResetEmail(normalizedEmail, result.token, baseUrl)
      } catch (err) {
        console.error('[forgot-password] Failed to send reset email:', err)
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[forgot-password] Reset link for ${normalizedEmail}: ${baseUrl}/reset-password?token=${result.token}`,
        )
      }
    }

    // Never reveal whether the email exists.
    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[forgot-password] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
