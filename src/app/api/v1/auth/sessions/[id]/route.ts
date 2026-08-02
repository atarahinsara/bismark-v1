import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/auth-service'
import { AuthExtensionError, revokeSession } from '@/lib/auth/auth-extensions'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/v1/auth/sessions/{id}
 *
 * Revoke a specific session belonging to the authenticated user.
 *
 * Response:
 *   200: { success: true }
 *   404: Session not found
 */
export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    await revokeSession(id, ctx.userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthExtensionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }
    console.error('[session DELETE] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
