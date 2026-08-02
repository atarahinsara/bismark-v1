import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/auth-service'
import { markAsRead } from '@/lib/notifications/notification-service'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/notifications/{id}/read
 *
 * Mark a single in-app notification as read for the authenticated user.
 *
 * Response:
 *   200: { success: true }
 *   404: Notification not found
 */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    await markAsRead(id, ctx.userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'Notification not found') {
      return NextResponse.json({ error: 'Notification not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('[notification read] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
