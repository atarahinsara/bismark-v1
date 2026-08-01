import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'product.read')

    const user = await db.user.findFirst({
      where: { id: ctx.userId },
      select: { id: true, username: true, displayName: true, email: true, phone: true, userType: true, locale: true }
    })
    return jsonResponse({ data: user })
  } catch (e) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed', statusCode: 500 })
  }
}
