/**
 * Outbox Publisher — publishes messages to event listeners.
 *
 * In production, this would publish to:
 *   - Internal event bus (for in-process listeners)
 *   - Message broker (RabbitMQ, Kafka) for cross-service
 *   - Webhook subscribers (HTTP POST)
 *
 * In sandbox, we dispatch to in-process listeners only.
 */

import type { OutboxMessage } from '@prisma/client'

export type EventListener = (message: OutboxMessage) => void | Promise<void>

export class OutboxPublisher {
  private static listeners: Map<string, Set<EventListener>> = new Map()

  /**
   * Subscribe to a specific event type.
   */
  static on(eventType: string, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
  }

  /**
   * Publish a message to all subscribed listeners.
   * Returns true if all listeners succeeded, false otherwise.
   */
  static async publish(message: OutboxMessage): Promise<boolean> {
    const listeners = this.listeners.get(message.eventType)
    const wildcardListeners = this.listeners.get('*')

    const allListeners = [
      ...(listeners ?? []),
      ...(wildcardListeners ?? []),
    ]

    if (allListeners.length === 0) {
      // No listeners — still counts as "published" (message can be picked up later)
      return true
    }

    try {
      await Promise.all(allListeners.map((l) => l(message)))
      return true
    } catch (e) {
      console.error(`[OUTBOX] Failed to publish message ${message.id}:`, e)
      return false
    }
  }
}
