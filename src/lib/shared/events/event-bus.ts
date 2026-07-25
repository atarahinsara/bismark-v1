import type { DomainEvent } from './domain-event'
import type { EventBusInterface } from '../contracts/event-bus-interface'

type EventListener = (event: DomainEvent) => void | Promise<void>

/**
 * In-process Event Bus (sandbox reference).
 * In production (Laravel), OutboxEventBus writes to outbox_events table
 * and a background job publishes to external systems.
 */
export class EventBus implements EventBusInterface {
  private listeners: Map<string, Set<EventListener>> = new Map()

  /** Subscribe to an event type */
  on(eventType: string, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
  }

  /** Dispatch an event to all listeners */
  async dispatch(event: DomainEvent): Promise<void> {
    const type = event.eventType()
    const listeners = this.listeners.get(type)
    if (listeners) {
      await Promise.all(Array.from(listeners).map((l) => l(event)))
    }

    // Also dispatch to wildcard listeners
    const wildcard = this.listeners.get('*')
    if (wildcard) {
      await Promise.all(Array.from(wildcard).map((l) => l(event)))
    }
  }

  /** Clear all listeners (for testing) */
  clear(): void {
    this.listeners.clear()
  }
}

// Singleton instance
let busInstance: EventBus | null = null

export function getEventBus(): EventBus {
  if (!busInstance) {
    busInstance = new EventBus()
  }
  return busInstance
}
