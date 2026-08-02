import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'

/** GET /api/v1/admin/users — list users with search/filter/pagination */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ctx.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const role = searchParams.get('role') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status
    if (role) {
      where.userRoles = { some: { role: { key: role } } }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, username: true, displayName: true, email: true,
          status: true, isActive: true, userType: true, lastLoginAt: true,
          emailVerifiedAt: true, createdAt: true,
          userRoles: { include: { role: { select: { key: true, name: true } } } },
        },
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[admin/users] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
