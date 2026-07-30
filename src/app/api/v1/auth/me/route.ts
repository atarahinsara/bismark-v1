import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { getAuthContext, getUserPermissions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/auth/me
 *
 * Returns the current authenticated user's profile + permissions.
 * Requires: Bearer token (authenticated)
 *
 * Response:
 *   200: { data: { user, permissions } }
 *   401: Not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const authCtx = getAuthContext(request)
    if (!authCtx) {
      return errorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        statusCode: 401,
      })
    }

    const user = await db.user.findFirst({
      where: { id: authCtx.userId, tenantId: authCtx.tenantId, deletedAt: null },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        userType: true,
        status: true,
        locale: true,
        tenantId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      return errorResponse({
        code: 'USER_NOT_FOUND',
        message: 'User account not found',
        statusCode: 404,
      })
    }

    const permissions = await getUserPermissions(authCtx.userId, authCtx.tenantId)

    return jsonResponse({
      data: {
        user,
        roles: authCtx.roles,
        permissions,
        sessionId: authCtx.sessionId,
      },
    })
  } catch (e) {
    console.error('[auth/me] error:', e)
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user profile',
      statusCode: 500,
    })
  }
}
