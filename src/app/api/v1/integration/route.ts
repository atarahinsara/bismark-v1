import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'
import { EVENT_CATALOG } from '@/lib/event-catalog'
import { SagaManager } from '@/lib/saga/saga-manager'

/**
 * GET /api/v1/integration/dashboard
 * Integration dashboard data: outbox stats, inbox stats, saga stats, DLQ, event catalog.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()

    // Outbox stats
    const outboxStats = await db.outboxMessage.groupBy({
      by: ['status'],
      _count: true,
    })

    // Inbox (processed messages) stats
    const inboxStats = await db.processedMessage.groupBy({
      by: ['consumerId'],
      _count: true,
    })

    // Saga stats
    const sagaStats = await db.sagaInstance.groupBy({
      by: ['status'],
      _count: true,
    })

    // Active sagas
    const activeSagas = await SagaManager.listActive(tenantId)

    // Dead letter messages (direct query)
    const deadLetters = await db.outboxMessage.findMany({
      where: { status: 'dead_letter', tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Recent outbox messages
    const recentOutbox = await db.outboxMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return jsonResponse({
      data: {
        outbox: {
          stats: outboxStats.map((s: any) => ({ status: s.status, count: s._count })),
          total: outboxStats.reduce((sum: number, s: any) => sum + s._count, 0),
          recent: recentOutbox.map((m: any) => ({
            id: m.id,
            eventType: m.eventType,
            eventVersion: m.eventVersion,
            status: m.status,
            attempts: m.attempts,
            occurredAt: m.occurredAt.toISOString(),
            publishedAt: m.publishedAt?.toISOString() ?? null,
            errorMessage: m.errorMessage,
          })),
        },
        inbox: {
          stats: inboxStats.map((s: any) => ({ consumerId: s.consumerId, count: s._count })),
          total: inboxStats.reduce((sum: number, s: any) => sum + s._count, 0),
        },
        saga: {
          stats: sagaStats.map((s: any) => ({ status: s.status, count: s._count })),
          active: activeSagas.map((s: any) => ({
            id: s.id,
            sagaDefinitionKey: s.sagaDefinitionKey,
            correlationId: s.correlationId,
            status: s.status,
            currentStep: s.currentStep,
            totalSteps: s.totalSteps,
            startedAt: s.startedAt?.toISOString() ?? null,
          })),
        },
        deadLetter: {
          count: deadLetters.length,
          messages: deadLetters.map((m: any) => ({
            id: m.id,
            eventType: m.eventType,
            attempts: m.attempts,
            errorMessage: m.errorMessage,
            createdAt: m.createdAt.toISOString(),
          })),
        },
        eventCatalog: {
          total: EVENT_CATALOG.length,
          events: EVENT_CATALOG.map((e) => ({
            eventType: e.eventType,
            version: e.version,
            publisher: e.publisher,
            consumers: e.consumers,
            retryPolicy: e.retryPolicy,
          })),
        },
      },
    })
  } catch (e) {
    console.error('[INTEGRATION API] Error:', e)
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to load dashboard: ' + (e as Error).message, statusCode: 500 })
  }
}

/**
 * POST /api/v1/integration/process-outbox
 * Manually trigger Outbox processing (for testing).
 */
export async function POST(request: NextRequest) {
  try {
    const { OutboxDispatcher } = await import('@/lib/shared/outbox')
    const stats = await OutboxDispatcher.processBatch()
    return jsonResponse({ data: stats })
  } catch (e) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to process outbox', statusCode: 500 })
  }
}
