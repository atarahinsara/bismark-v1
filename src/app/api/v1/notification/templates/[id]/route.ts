import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/notification/templates/{id}
 * Get a single template by id (including _count notifications).
 */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const tenantId = await getTenantId()
    const { id } = await params

    const template = await db.notificationTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { _count: { select: { notifications: true } } },
    })
    if (!template) throw new NotFoundException('NotificationTemplate', id)

    return jsonResponse({ data: toDTO(template) })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch template',
      statusCode: 500,
    })
  }
}

function toDTO(t: any) {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    version: t.version,
    language: t.language,
    channel: t.channel,
    subjectTemplate: t.subjectTemplate,
    bodyTemplate: t.bodyTemplate,
    variablesSchema: t.variablesSchema,
    status: t.status,
    effectiveFrom: t.effectiveFrom.toISOString(),
    effectiveTo: t.effectiveTo?.toISOString() ?? null,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    notificationCount: t._count?.notifications ?? 0,
  }
}
