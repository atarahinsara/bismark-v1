import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/auth-service'
import { markAllAsRead } from '@/lib/notifications/notification-service'

/**
 * POST /api/v1/notifications/read-all
 *
 * Mark all of the authenticated user's in-app notifications as read.
 *
 * Response:
 *   200: { updated: number }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await markAllAsRead(ctx.userId)

    return NextResponse.json({ updated: result.updated })
  } catch (err) {
    console.error('[notifications read-all] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
