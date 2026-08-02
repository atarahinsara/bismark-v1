import { NextRequest, NextResponse } from 'next/server'
import { AuthExtensionError, verifyEmail } from '@/lib/auth/auth-extensions'

/**
 * POST /api/v1/auth/verify-email
 *
 * Verify a user's email address using the token sent at registration time.
 *
 * Request body:
 *   { token: string }
 *
 * Response:
 *   200: { success, message }
 *   400: Invalid token
 *   410: Token expired
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.token !== 'string' || !body.token.trim()) {
      return NextResponse.json(
        { error: 'Token is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    await verifyEmail(body.token.trim())

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[verify-email] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
