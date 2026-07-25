import { NextRequest } from 'next/server'
import {
  getTenantId,
  jsonResponse,
  errorResponse,
  parseQueryParams,
} from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'
import { notificationService } from '@/lib/modules/notification'
import type { Channel, NotificationStatus } from '@/lib/modules/notification'

/**
 * GET /api/v1/notifications
 * List notifications (LAW-55/56/57 read side).
 *
 * Query: page, per_page, status, channel, recipientId
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as NotificationStatus | null
    const channel = url.searchParams.get('channel') as Channel | null
    const recipientId = url.searchParams.get('recipientId')

    const result = await notificationService.list({
      tenantId,
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
      ...(recipientId ? { recipientId } : {}),
      page: params.page,
      perPage: params.perPage,
    })

    return jsonResponse({
      data: result.data.map(toDTO),
      meta: {
        page: params.page,
        per_page: params.perPage,
        total: result.total,
        last_page: Math.ceil(result.total / params.perPage) || 1,
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
      message: 'Failed to list notifications',
      statusCode: 500,
    })
  }
}

function toDTO(n: any) {
  return {
    id: n.id,
    templateId: n.templateId,
    templateCode: n.templateCode,
    templateVersion: n.templateVersion,
    language: n.language,
    recipientId: n.recipientId,
    recipientName: n.recipientName,
    recipientAddress: n.recipientAddress,
    channel: n.channel,
    status: n.status,
    renderedSubject: n.renderedSubject,
    renderedBody: n.renderedBody,
    messageId: n.messageId,
    errorCode: n.errorCode,
    errorMessage: n.errorMessage,
    createdAt: n.createdAt.toISOString(),
    queuedAt: n.queuedAt?.toISOString() ?? null,
    sentAt: n.sentAt?.toISOString() ?? null,
    failedAt: n.failedAt?.toISOString() ?? null,
    cancelledAt: n.cancelledAt?.toISOString() ?? null,
    cancelledBy: n.cancelledBy,
    cancelReason: n.cancelReason,
    deliveryCount: n._count?.deliveries ?? 0,
  }
}
