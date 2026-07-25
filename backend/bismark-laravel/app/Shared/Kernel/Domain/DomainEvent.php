<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Domain;

/**
 * Base class for all Domain Events.
 *
 * Events are dispatched via OutboxEventBus to ensure transactional reliability.
 * Cross-context communication happens exclusively via Domain Events (LAW-01, LAW-03).
 */
abstract class DomainEvent
{
    public function __construct(
        public readonly string $eventId,
        public readonly \DateTimeImmutable $occurredAt,
        public readonly ?string $tenantId,
        public readonly ?string $actorId,
        public readonly ?string $causationId = null,
        public readonly ?string $correlationId = null,
    ) {}

    /**
     * Unique event type identifier (e.g., 'sales_order.created').
     */
    abstract public function eventType(): string;

    /**
     * Event schema version for webhook consumers (ADR Step 4 delta 3).
     */
    public function eventVersion(): string
    {
        return '1.0';
    }

    /**
     * The aggregate type that emitted this event.
     */
    abstract public function aggregateType(): string;

    /**
     * The aggregate ID this event pertains to.
     */
    abstract public function getAggregateId(): string;

    /**
     * Serializable payload for the outbox + webhook delivery.
     *
     * @return array<string, mixed>
     */
    abstract public function payload(): array;

    /**
     * Convert to outbox table row format.
     *
     * @return array<string, mixed>
     */
    public function toOutboxRow(): array
    {
        return [
            'id' => $this->eventId,
            'aggregate_type' => $this->aggregateType(),
            'aggregate_id' => $this->getAggregateId(),
            'event_type' => $this->eventType(),
            'event_version' => $this->eventVersion(),
            'tenant_id' => $this->tenantId,
            'actor_id' => $this->actorId,
            'payload' => json_encode($this->payload()),
            'occurred_at' => $this->occurredAt->format('Y-m-d H:i:s.u'),
            'created_at' => now(),
        ];
    }
}
