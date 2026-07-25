<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Outbox;

use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Domain\DomainEvent;
use Illuminate\Support\Facades\DB;

/**
 * Outbox Event Bus — Transactional Event Publishing.
 *
 * Writes events to the outbox_events table IN THE SAME TRANSACTION as
 * the aggregate change, then a background job (ProcessOutbox) publishes
 * them to external systems (WebSocket, Webhook subscribers).
 *
 * This guarantees at-least-once delivery without 2PC.
 */
final class OutboxEventBus implements EventBusInterface
{
    /**
     * Dispatch a domain event.
     * Must be called within a DB::transaction().
     */
    public function dispatch(DomainEvent $event): void
    {
        DB::table('outbox_events')->insert($event->toOutboxRow());

        // Also fire synchronously for in-process Laravel listeners
        // (e.g., Audit listener that records to audit_logs)
        event($event);
    }

    /**
     * Dispatch multiple events atomically.
     *
     * @param DomainEvent[] $events
     */
    public function dispatchMany(array $events): void
    {
        $rows = array_map(fn (DomainEvent $e) => $e->toOutboxRow(), $events);
        DB::table('outbox_events')->insert($rows);

        foreach ($events as $event) {
            event($event);
        }
    }
}
