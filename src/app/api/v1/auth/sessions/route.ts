import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/auth-service'
import { AuthExtensionError, getUserSessions, revokeAllSessions } from '@/lib/auth/auth-extensions'

/**
 * GET /api/v1/auth/sessions
 *
 * List the authenticated user's active sessions.
 *
 * Response:
 *   200: { sessions: Session[] }
 *
 * DELETE /api/v1/auth/sessions
 *
 * Revoke all of the authenticated user's sessions EXCEPT the current one.
 *
 * Response:
 *   200: { count: number }
 */

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getUserSessions(ctx.userId)

    return NextResponse.json({ sessions })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[sessions GET] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Keep the current session alive; revoke all others.
    const count = await revokeAllSessions(ctx.userId, ctx.sessionId)

    return NextResponse.json({ count })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[sessions DELETE] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
