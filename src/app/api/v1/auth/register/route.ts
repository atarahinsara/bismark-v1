import { NextRequest, NextResponse } from 'next/server'
import { AuthExtensionError, register } from '@/lib/auth/auth-extensions'
import { sendVerificationEmail } from '@/lib/email/email-service'
import { isCaptchaRequired, verifyCaptcha } from '@/lib/captcha/captcha-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const { username, email, password, displayName } = body as Record<string, unknown>

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters', code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 1) {
      return NextResponse.json({ error: 'Password is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    // Captcha check
    if (await isCaptchaRequired('register')) {
      const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : ''
      const captchaResult = await verifyCaptcha(captchaToken)
      if (!captchaResult.success) {
        return NextResponse.json({ error: captchaResult.error || 'Captcha verification failed', code: 'CAPTCHA_FAILED' }, { status: 400 })
      }
    }

    // Get tenant ID
    const tenantId = '01910000-0000-7000-8000-000000000001'
    const normalizedEmail = email.trim().toLowerCase()

    const result = await register({
      username: username.trim(),
      email: normalizedEmail,
      password,
      displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : undefined,
      tenantId,
    })

    // Send verification email (best-effort)
    const baseUrl = new URL(req.url).origin
    try {
      await sendVerificationEmail(normalizedEmail, result.verificationToken, baseUrl)
    } catch (err) {
      console.error('[register] Failed to send verification email:', err)
    }

    return NextResponse.json({
      userId: result.userId,
      message: 'ثبت‌نام موفق بود. لطفاً ایمیل خود را بررسی کنید.',
    }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[register] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
