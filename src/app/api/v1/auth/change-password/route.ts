import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, AuthError } from '@/lib/auth/auth-service'
import { AuthExtensionError, changePassword } from '@/lib/auth/auth-extensions'

/**
 * POST /api/v1/auth/change-password
 *
 * Change the password of the currently authenticated user.
 * Requires the current password. On success, all other sessions are revoked
 * (the current session is kept).
 *
 * Request body:
 *   { oldPassword: string, newPassword: string }
 *
 * Response:
 *   200: { success, message }
 *   401: Unauthorized / wrong current password
 *   422: Weak new password
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body.oldPassword !== 'string' || !body.oldPassword) {
      return NextResponse.json(
        { error: 'Current password is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }
    if (!body.newPassword || typeof body.newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    // Keep the current session alive; revoke all others.
    await changePassword(ctx.userId, body.oldPassword, body.newPassword, ctx.sessionId)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. All other sessions have been revoked.',
    })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[change-password] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
