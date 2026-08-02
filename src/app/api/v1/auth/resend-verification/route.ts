import { NextRequest, NextResponse } from 'next/server'
import { AuthExtensionError, resendVerificationEmail } from '@/lib/auth/auth-extensions'
import { sendVerificationEmail } from '@/lib/email/email-service'
import { getTenantId } from '@/lib/api-helpers'

/**
 * POST /api/v1/auth/resend-verification
 * Body: { email }
 * Resends the email verification link. Rate-limited to 3 per hour.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Email is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const tenantId = await getTenantId()
    const result = await resendVerificationEmail(body.email.trim().toLowerCase(), tenantId)

    if (result.rateLimited) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌های ارسال ایمیل تأیید بیش از حد بوده. لطفاً یک ساعت بعد دوباره تلاش کنید.', code: 'RATE_LIMITED' },
        { status: 429 },
      )
    }

    // Send email if token was generated
    if (result.token && result.userId) {
      const baseUrl = new URL(req.url).origin
      try {
        await sendVerificationEmail(body.email, result.token, baseUrl)
      } catch (err) {
        console.error('[resend] Failed to send email:', err)
      }

      // In dev mode, log the link
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[resend] Verification link for ${body.email}: ${baseUrl}/verify-email?token=${result.token}`)
      }
    }

    // Always return generic success (don't reveal if email exists)
    return NextResponse.json({
      message: 'اگر ایمیل ثبت شده باشد، لینک تأیید مجدداً ارسال شد.',
    })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[resend] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
