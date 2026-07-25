import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, errorResponse } from '@/lib/api-helpers'
import {
  IdempotencyHelper,
  UnitOfWork,
  DomainException,
  ValidationException,
  NotFoundException,
} from '@/lib/shared'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/notification/templates/{id}/publish
 *
 * Publish a draft template (LAW-55: versioned, language-aware).
 * In a UnitOfWork:
 *   1. Find the draft template; throw NotFoundException if missing or not draft.
 *   2. Set status='published', publishedAt=now.
 *   3. For all OTHER templates with same (tenantId, code, language, channel)
 *      AND status='published' AND id != this id, set effectiveTo=now
 *      (deactivate). Don't change their status — audit history preserved.
 *   4. Append outbox event 'notification_template.published'.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const { id } = await params
    // Read body once as text for idempotency hashing — see send/route.ts for rationale.
    const rawBody = await request.text().catch(() => '')

    const template = await db.notificationTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
    if (!template) throw new NotFoundException('NotificationTemplate', id)
    if (template.status !== 'draft')
      throw new ValidationException(
        `Template is not a draft (current status: ${template.status})`,
        [
          {
            field: 'status',
            message: `Must be 'draft' to publish (current: ${template.status})`,
            code: 'INVALID_STATE',
          },
        ],
      )

    const now = new Date()

    const updated = await UnitOfWork.execute(async (uow) => {
      // (a) Mark this template as published
      const refreshed = await uow.tx.notificationTemplate.update({
        where: { id },
        data: { status: 'published', publishedAt: now },
        include: { _count: { select: { notifications: true } } },
      })

      // (b) Deactivate previously-published siblings (same code+language+channel)
      //     by setting effectiveTo=now. Don't touch their status — audit history.
      await uow.tx.notificationTemplate.updateMany({
        where: {
          tenantId,
          code: template.code,
          language: template.language,
          channel: template.channel,
          status: 'published',
          id: { not: id },
        },
        data: { effectiveTo: now },
      })

      // (c) Outbox event
      await uow.outbox.append({
        tenantId,
        aggregateType: 'NotificationTemplate',
        aggregateId: id,
        eventType: 'notification_template.published',
        eventVersion: '1.0',
        payload: {
          templateId: id,
          code: template.code,
          version: template.version,
          language: template.language,
          channel: template.channel,
          publishedAt: now.toISOString(),
        },
        actorId: null,
      })

      return refreshed
    })

    const responseBody = JSON.stringify({
      data: toDTO(updated),
      message:
        'Template published. Previous published version of the same code/language/channel deactivated.',
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
        errors: (e as ValidationException).errors,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to publish template',
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
