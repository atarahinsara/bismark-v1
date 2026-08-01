import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'
import { notificationService } from '@/lib/modules/notification'

/**
 * GET /api/v1/notifications/stats
 * Dashboard stats (LAW-55/56/57 read side).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.read')

    const tenantId = await getTenantId()
    const stats = await notificationService.getStats(tenantId)
    return jsonResponse({ data: stats })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch notification stats',
      statusCode: 500,
    })
  }
}
