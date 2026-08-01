import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/notification/templates/{id}/versions
 *
 * List all versions of the same (code, language, channel) as the given
 * template (LAW-55: versioned, language-aware). Ordered by version DESC.
 */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.read')

    const tenantId = await getTenantId()
    const { id } = await params

    const template = await db.notificationTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        code: true,
        language: true,
        channel: true,
      },
    })
    if (!template) throw new NotFoundException('NotificationTemplate', id)

    const versions = await db.notificationTemplate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        code: template.code,
        language: template.language,
        channel: template.channel,
      },
      include: { _count: { select: { notifications: true } } },
      orderBy: { version: 'desc' },
    })

    return jsonResponse({
      data: versions.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        version: v.version,
        language: v.language,
        channel: v.channel,
        status: v.status,
        effectiveFrom: v.effectiveFrom.toISOString(),
        effectiveTo: v.effectiveTo?.toISOString() ?? null,
        publishedAt: v.publishedAt?.toISOString() ?? null,
        description: v.description,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        notificationCount: v._count?.notifications ?? 0,
      })),
      meta: {
        code: template.code,
        language: template.language,
        channel: template.channel,
        count: versions.length,
      },
    })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to list template versions',
      statusCode: 500,
    })
  }
}
