import type { DomainEvent } from '../events/domain-event'

/**
 * Event Bus Contract — for dispatching domain events.
 * Mirrors App\Shared\Kernel\Contracts\EventBusInterface in Laravel.
 */
export interface EventBusInterface {
  dispatch(event: DomainEvent): Promise<void>
}
