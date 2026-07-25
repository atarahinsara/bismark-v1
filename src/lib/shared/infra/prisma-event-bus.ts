import type { DomainEvent } from '../events/domain-event'
import type { EventBusInterface } from '../contracts/event-bus-interface'

/**
 * Prisma-backed Event Bus with Outbox Pattern (sandbox reference).
 *
 * In production (Laravel), this writes to the outbox_events table
 * and a background job publishes to external systems.
 * In sandbox, we dispatch synchronously to in-process listeners.
 */
export class PrismaEventBus implements EventBusInterface {
  private listeners: Map<string, Set<(event: DomainEvent) => void | Promise<void>>> = new Map()

  on(eventType: string, listener: (event: DomainEvent) => void | Promise<void>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const type = event.eventType()
    const listeners = this.listeners.get(type)
    if (listeners) {
      await Promise.all(Array.from(listeners).map((l) => l(event)))
    }

    const wildcard = this.listeners.get('*')
    if (wildcard) {
      await Promise.all(Array.from(wildcard).map((l) => l(event)))
    }
  }
}

let instance: PrismaEventBus | null = null

export function getPrismaEventBus(): PrismaEventBus {
  if (!instance) {
    instance = new PrismaEventBus()
  }
  return instance
}
