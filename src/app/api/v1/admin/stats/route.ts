import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'

/** GET /api/v1/admin/stats — dashboard statistics (admin only) */
export async function GET(req: Request) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ctx.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [totalUsers, activeUsers, pendingUsers, lockedUsers, totalRoles, totalPermissions, activeSessions, auditLogCount] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { deletedAt: null, isActive: true, status: 'active' } }),
      db.user.count({ where: { deletedAt: null, status: 'pending' } }),
      db.user.count({ where: { deletedAt: null, status: 'locked' } }),
      db.role.count(),
      db.permission.count(),
      db.session.count({ where: { status: 'active' } }),
      db.auditLog.count().catch(() => 0),
    ])

    // Recent users (last 5)
    const recentUsers = await db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, username: true, displayName: true, email: true, status: true, createdAt: true },
    })

    // Recent audit logs (last 10)
    const recentLogs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, action: true, module: true, ipAddress: true, createdAt: true, userId: true },
    }).catch(() => [])

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        pendingUsers,
        lockedUsers,
        totalRoles,
        totalPermissions,
        activeSessions,
        auditLogCount,
      },
      recentUsers,
      recentLogs,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
