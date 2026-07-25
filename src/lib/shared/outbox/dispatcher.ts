/**
 * Outbox Dispatcher — polls outbox_messages and publishes pending messages.
 *
 * LAW-08: Operational implementation.
 *
 * Flow:
 *   1. Poll every N seconds for pending messages
 *   2. For each message:
 *      a. Try to publish via OutboxPublisher
 *      b. On success: mark as 'published'
 *      c. On failure: increment attempts, set nextRetryAt
 *      d. After max attempts: move to Dead Letter Queue
 *
 * In production, this runs as a background worker (queue worker, cron job).
 * In sandbox, it can be triggered manually via API or cron.
 */

import { db } from '@/lib/db'
import { OutboxPublisher } from './publisher'
import { RetryPolicy } from './retry-policy'
import { DeadLetterHandler } from './dead-letter'

const BATCH_SIZE = 100

export class OutboxDispatcher {
  private static running = false

  /**
   * Process one batch of pending outbox messages.
   * Returns the number of messages processed.
   */
  static async processBatch(): Promise<{
    processed: number
    published: number
    failed: number
    deadLettered: number
  }> {
    const stats = { processed: 0, published: 0, failed: 0, deadLettered: 0 }

    const messages = await db.outboxMessage.findMany({
      where: {
        status: 'pending',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      orderBy: { occurredAt: 'asc' },
      take: BATCH_SIZE,
    })

    for (const message of messages) {
      stats.processed++

      const success = await OutboxPublisher.publish(message)

      if (success) {
        await db.outboxMessage.update({
          where: { id: message.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            nextRetryAt: null,
          },
        })
        stats.published++
      } else {
        const decision = RetryPolicy.decide(message.attempts)

        if (decision.shouldRetry) {
          await db.outboxMessage.update({
            where: { id: message.id },
            data: {
              attempts: decision.nextAttempt,
              nextRetryAt: new Date(Date.now() + decision.delaySeconds * 1000),
              errorMessage: 'Publish failed',
            },
          })
          stats.failed++
        } else {
          await DeadLetterHandler.moveToDeadLetter(
            message.id,
            `Max retries (${RetryPolicy.maxAttempts}) exceeded`,
          )
          stats.deadLettered++
        }
      }
    }

    return stats
  }

  /**
   * Start a continuous polling loop.
   * In production, this would be a queue worker or cron job.
   */
  static async start(intervalMs: number = 5000): Promise<void> {
    if (this.running) return
    this.running = true

    const loop = async () => {
      while (this.running) {
        try {
          await this.processBatch()
        } catch (e) {
          console.error('[OUTBOX] Dispatcher error:', e)
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }
    }

    loop()
  }

  static stop(): void {
    this.running = false
  }
}
