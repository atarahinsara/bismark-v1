/**
 * Dead Letter Handler — handles messages that exceeded max retry attempts.
 *
 * LAW-08: After 8 failed attempts, message status changes to 'dead_letter'
 * and requires manual intervention.
 */

import { db } from '@/lib/db'

export class DeadLetterHandler {
  /**
   * Move a message to dead letter queue.
   * In production, this would also trigger an alert (email, Slack, etc.)
   */
  static async moveToDeadLetter(messageId: string, error: string): Promise<void> {
    await db.outboxMessage.update({
      where: { id: messageId },
      data: {
        status: 'dead_letter',
        errorMessage: error,
        nextRetryAt: null,
      },
    })

    // In production: send alert to ops team
    console.error(`[DEAD LETTER] Message ${messageId} moved to dead letter queue: ${error}`)
  }

  /**
   * List all dead letter messages for admin review.
   */
  static async listDeadLetters(tenantId?: string) {
    return db.outboxMessage.findMany({
      where: {
        status: 'dead_letter',
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  /**
   * Retry a dead letter message manually (reset attempts).
   */
  static async retry(messageId: string): Promise<void> {
    await db.outboxMessage.update({
      where: { id: messageId },
      data: {
        status: 'pending',
        attempts: 0,
        nextRetryAt: new Date(),
        errorMessage: null,
      },
    })
  }
}
