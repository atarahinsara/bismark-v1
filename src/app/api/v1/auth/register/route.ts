import { NextRequest, NextResponse } from 'next/server'
import { AuthExtensionError, register } from '@/lib/auth/auth-extensions'
import { sendVerificationEmail } from '@/lib/email/email-service'
import { isCaptchaRequired, verifyCaptcha } from '@/lib/captcha/captcha-service'
import { getTenantId } from '@/lib/api-helpers'
import { getClientIP } from '@/lib/rate-limiter'

/**
 * POST /api/v1/auth/register
 *
 * Register a new user account.
 *
 * Request body:
 *   { username, email, password, displayName?, captchaToken? }
 *
 * Response:
 *   201: { userId, message }
 *   400: Validation error
 *   409: Username/email already taken
 *   422: Weak password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const { username, email, password, displayName } = body as Record<string, unknown>

    // --- Validation ---
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }
    if (!password || typeof password !== 'string' || password.length < 1) {
      return NextResponse.json({ error: 'Password is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    // --- Captcha (if enabled for the register form) ---
    if (await isCaptchaRequired('register')) {
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
    const normalizedEmail = email.trim().toLowerCase()

    // --- Create user + verification token ---
    const result = await register({
      username: username.trim(),
      email: normalizedEmail,
      password,
      displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : undefined,
      tenantId,
      ipAddress,
    })

    // --- Send verification email (best-effort; never fail registration on email error) ---
    const baseUrl = new URL(req.url).origin
    try {
      await sendVerificationEmail(normalizedEmail, result.verificationToken, baseUrl)
    } catch (err) {
      console.error('[register] Failed to send verification email:', err)
    }

    // In non-production, log the verification link so the flow is testable
    // without a configured SMTP server.
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[register] Verification link for ${normalizedEmail}: ${baseUrl}/auth/verify-email?token=${result.verificationToken}`,
      )
    }

    return NextResponse.json(
      {
        userId: result.userId,
        message: 'Registration successful. Please check your email to verify your account.',
      },
      { status: 201 },
    )
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[register] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
