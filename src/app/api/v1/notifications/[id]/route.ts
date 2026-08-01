import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'
import { notificationService } from '@/lib/modules/notification'

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/notifications/{id}
 * Get a notification with deliveries + queue items.
 */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'notification.read')

    const tenantId = await getTenantId()
    const { id } = await params

    const notification = await notificationService.getById(tenantId, id)
    if (!notification) throw new NotFoundException('Notification', id)

    return jsonResponse({ data: toDTO(notification) })
  } catch (e) {
    if (e instanceof DomainException)
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
      })
    return errorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch notification',
      statusCode: 500,
    })
  }
}

function toDTO(n: any) {
  return {
    id: n.id,
    templateId: n.templateId,
    template: n.template
      ? {
          id: n.template.id,
          code: n.template.code,
          version: n.template.version,
          name: n.template.name,
          language: n.template.language,
          channel: n.template.channel,
        }
      : null,
    templateCode: n.templateCode,
    templateVersion: n.templateVersion,
    language: n.language,
    recipientId: n.recipientId,
    recipientName: n.recipientName,
    recipientAddress: n.recipientAddress,
    channel: n.channel,
    status: n.status,
    payload: n.payload,
    renderedSubject: n.renderedSubject,
    renderedBody: n.renderedBody,
    messageId: n.messageId,
    idempotencyKey: n.idempotencyKey,
    errorCode: n.errorCode,
    errorMessage: n.errorMessage,
    createdAt: n.createdAt.toISOString(),
    queuedAt: n.queuedAt?.toISOString() ?? null,
    sentAt: n.sentAt?.toISOString() ?? null,
    failedAt: n.failedAt?.toISOString() ?? null,
    cancelledAt: n.cancelledAt?.toISOString() ?? null,
    cancelledBy: n.cancelledBy,
    cancelReason: n.cancelReason,
    version: n.version,
    deliveries: (n.deliveries ?? []).map((d: any) => ({
      id: d.id,
      provider: d.provider,
      attempt: d.attempt,
      status: d.status,
      durationMs: d.durationMs,
      errorMessage: d.errorMessage,
      response: d.response,
      createdAt: d.createdAt.toISOString(),
    })),
    queueItems: (n.queueItems ?? []).map((q: any) => ({
      id: q.id,
      priority: q.priority,
      attempt: q.attempt,
      maxAttempts: q.maxAttempts,
      nextRetryAt: q.nextRetryAt.toISOString(),
      inDeadLetter: q.inDeadLetter,
      deadLetterAt: q.deadLetterAt?.toISOString() ?? null,
      deadLetterReason: q.deadLetterReason,
      lockedBy: q.lockedBy,
      lockedAt: q.lockedAt?.toISOString() ?? null,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    })),
  }
}
