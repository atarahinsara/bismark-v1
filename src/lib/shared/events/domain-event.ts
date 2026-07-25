/**
 * Domain Event — base class for all events.
 * Mirrors App\Shared\Kernel\Domain\DomainEvent in Laravel.
 *
 * Events are dispatched via EventBus to listeners (audit, notifications, etc.)
 * and persisted to outbox for reliable cross-module communication.
 */
export abstract class DomainEvent {
  public readonly eventId: string
  public readonly occurredAt: Date
  public readonly correlationId: string

  constructor(
    public readonly tenantId: string,
    public readonly actorId: string | null,
    correlationId?: string,
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
    this.correlationId = correlationId ?? this.eventId
  }

  /** Unique event type (e.g., 'product_category.created') */
  abstract eventType(): string

  /** Event schema version (for webhook consumers — Step 4 delta 3) */
  eventVersion(): string {
    return '1.0'
  }

  /** The aggregate type that emitted this event */
  abstract aggregateType(): string

  /** The aggregate ID this event pertains to */
  abstract aggregateId(): string

  /** Serializable payload */
  abstract payload(): Record<string, unknown>

  /** Convert to outbox row format */
  toOutboxRow() {
    return {
      id: this.eventId,
      aggregate_type: this.aggregateType(),
      aggregate_id: this.aggregateId(),
      event_type: this.eventType(),
      event_version: this.eventVersion(),
      tenant_id: this.tenantId,
      actor_id: this.actorId,
      payload: JSON.stringify(this.payload()),
      occurred_at: this.occurredAt.toISOString(),
    }
  }
}
