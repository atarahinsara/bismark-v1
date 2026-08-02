import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'

/** GET /api/v1/admin/audit-logs — list audit logs with search/filter/pagination */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ctx.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || ''
    const module = searchParams.get('module') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (action) where.action = action
    if (module) where.entityType = module

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, action: true, module: true, entityType: true, entityId: true,
          entityType: true, ipAddress: true, userAgent: true,
          metadata: true, createdAt: true, userId: true,
        },
      }).catch(() => []),
      db.auditLog.count({ where }).catch(() => 0),
    ])

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[admin/audit-logs] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
