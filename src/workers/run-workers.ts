/**
 * BISMARK ERP — Background Worker Process
 *
 * Phase 5: Workers
 *
 * Runs three loops concurrently:
 *   1. Outbox Dispatcher — publishes pending outbox messages (LAW-08)
 *   2. Inbox Worker — consumes published messages and dispatches to handlers (LAW-09/26)
 *   3. Snapshot Worker — takes periodic stock balance snapshots (LAW-10)
 *
 * Usage:
 *   bun run src/workers/run-workers.ts
 *
 * In production: run as a separate Docker container (worker service).
 * In sandbox: run manually or via cron-like trigger.
 */

import { OutboxDispatcher } from '@/lib/shared/outbox/dispatcher'
import { InboxWorker } from '@/lib/shared/inbox/inbox-worker'
import { registerEventHandlers } from '@/lib/event-handlers'
import { registerFinancialEventHandlers } from '@/lib/financial-handlers'

// Register all event handlers BEFORE starting the worker
registerEventHandlers()
registerFinancialEventHandlers()

const POLL_INTERVAL_MS = 5000 // 5 seconds

console.log('[worker] Starting BISMARK background workers...')
console.log('[worker] Registered event handlers')
console.log(`[worker] Poll interval: ${POLL_INTERVAL_MS}ms`)

// ============================================================
// Loop 1: Outbox Dispatcher
// ============================================================
async function outboxLoop() {
  while (true) {
    try {
      const result = await OutboxDispatcher.processBatch()
      if (result.processed > 0) {
        console.log(`[outbox] Processed: ${result.processed}, Published: ${result.published}, Failed: ${result.failed}, DLQ: ${result.deadLettered}`)
      }
    } catch (e) {
      console.error('[outbox] Error:', e)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

// ============================================================
// Loop 2: Inbox Worker
// ============================================================
async function inboxLoop() {
  while (true) {
    try {
      const result = await InboxWorker.processBatch()
      if (result.processed > 0) {
        console.log(`[inbox] Processed: ${result.processed}, Dispatched: ${result.dispatched}, Skipped: ${result.skipped}, Failed: ${result.failed}`)
      }
    } catch (e) {
      console.error('[inbox] Error:', e)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

// ============================================================
// Loop 3: Notification Queue Processor
// ============================================================
async function notificationLoop() {
  const { notificationService } = await import('@/lib/modules/notification')
  const { db } = await import('@/lib/db')

  while (true) {
    try {
      // Find ready queue items
      const items = await db.notificationQueue.findMany({
        where: {
          inDeadLetter: false,
          lockedBy: null,
          nextRetryAt: { lte: new Date() },
        },
        orderBy: [{ priority: 'desc' }, { nextRetryAt: 'asc' }],
        take: 10,
      })

      for (const item of items) {
        try {
          const result = await notificationService.processQueueItem(item.id, 'worker-1')
          if (result.status !== 'skipped') {
            console.log(`[notification] Queue item ${item.id}: ${result.status}`)
          }
        } catch (e) {
          console.error(`[notification] Queue item ${item.id} error:`, e)
        }
      }
    } catch (e) {
      console.error('[notification] Error:', e)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

// ============================================================
// Helper
// ============================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================
// Start all loops
// ============================================================
Promise.all([
  outboxLoop(),
  inboxLoop(),
  notificationLoop(),
]).catch((e) => {
  console.error('[worker] Fatal error:', e)
  process.exit(1)
})

console.log('[worker] All loops started. Press Ctrl+C to stop.')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[worker] Shutting down...')
  process.exit(0)
})
process.on('SIGTERM', () => {
  console.log('\n[worker] SIGTERM received. Shutting down...')
  process.exit(0)
})
