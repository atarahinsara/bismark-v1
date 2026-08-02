import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/auth-service'
import { getNotifications, getUnreadCount } from '@/lib/notifications/notification-service'

/**
 * GET /api/v1/notifications/inbox
 *
 * List the authenticated user's in-app notifications (UserNotification table).
 *
 * NOTE: This route lives under `/inbox` because the top-level
 * `/api/v1/notifications` GET is already used by the notification-engine
 * admin list (see `notificationsApi.list` in api-client.ts and the existing
 * `src/app/api/v1/notifications/route.ts`). To avoid breaking that existing
 * endpoint, the user-facing inbox list is exposed here.
 *
 * Query: ?unreadOnly=true&limit=20&offset=0
 *
 * Response:
 *   200: { notifications: Notification[], unreadCount: number }
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20))
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0)

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(ctx.userId, { limit, offset, unreadOnly }),
      getUnreadCount(ctx.userId),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (err) {
    console.error('[notifications/inbox GET] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
