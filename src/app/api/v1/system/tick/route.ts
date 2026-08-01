import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api-helpers'
import { OutboxDispatcher } from '@/lib/shared/outbox/dispatcher'
import { InboxWorker } from '@/lib/shared/inbox'
import { registerEventHandlers } from '@/lib/event-handlers'
import { registerFinancialEventHandlers } from '@/lib/financial-handlers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

// Register handlers once
let handlersRegistered = false
function ensureHandlers() {
  if (!handlersRegistered) {
    registerEventHandlers()
    registerFinancialEventHandlers()
    handlersRegistered = true
  }
}

/**
 * POST /api/v1/system/tick
 * Phase 6: Scheduler — process outbox + inbox + notifications in one tick.
 * Can be called by external cron (e.g., every 30 seconds).
 * Requires: system.manage
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'system.manage')

    ensureHandlers()

    const [outboxResult, inboxResult] = await Promise.all([
      OutboxDispatcher.processBatch(),
      InboxWorker.processBatch(),
    ])

    return jsonResponse({
      data: {
        outbox: outboxResult,
        inbox: inboxResult,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error('[system/tick] error:', e)
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Tick failed', statusCode: 500 })
  }
}
