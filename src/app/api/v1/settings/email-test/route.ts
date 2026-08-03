import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/admin-auth'
import { sendTestEmail } from '@/lib/email/email-service'

/**
 * POST /api/v1/settings/email-test
 *
 * Send a test email to verify the SMTP configuration (admin only).
 *
 * Request body:
 *   { to: string }
 *
 * Response:
 *   200: { success, message }
 *   400: Invalid recipient
 *   403: Not an admin
 *   502: Email send failed (e.g. SMTP not configured)
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ctx.roles.includes('super_admin')) {
      return NextResponse.json(
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body.to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
      return NextResponse.json(
        { error: 'A valid "to" email address is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const result = await sendTestEmail(body.to)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test email', code: 'EMAIL_SEND_FAILED' },
        { status: 200 },
      )
    }

    return NextResponse.json({ success: true, message: 'Test email sent successfully' })
  } catch (err) {
    console.error('[settings/email-test] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
