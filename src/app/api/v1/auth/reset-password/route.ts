import { NextRequest, NextResponse } from 'next/server'
import { AuthExtensionError, resetPassword } from '@/lib/auth/auth-extensions'

/**
 * POST /api/v1/auth/reset-password
 *
 * Reset a user's password using a token obtained from the forgot-password flow.
 *
 * Request body:
 *   { token: string, newPassword: string }
 *
 * Response:
 *   200: { success, message }
 *   400: Invalid token
 *   410: Token expired
 *   422: Weak password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.token !== 'string' || !body.token.trim()) {
      return NextResponse.json({ error: 'Token is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    if (!body.newPassword || typeof body.newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    await resetPassword(body.token.trim(), body.newPassword)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[reset-password] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
