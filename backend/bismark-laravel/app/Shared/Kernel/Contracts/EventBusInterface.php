<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Contracts;

use App\Shared\Kernel\Domain\DomainEvent;

/**
 * EventBusInterface — abstraction over the Outbox dispatcher.
 *
 * Services dispatch events through this contract (not through Laravel's
 * Events facade) so we can guarantee at-least-once delivery via the outbox
 * table.
 *
 * Events MUST be persisted inside the same DB transaction as the state
 * change. They are released to the broker AFTER commit by the
 * OutboxEventBus.
 */
interface EventBusInterface
{
    /**
     * Queue an event for outbox persistence.
     */
    public function dispatch(DomainEvent $event): void;

    /**
     * Drain pending events from an aggregate root and persist them to the
     * outbox table inside the current transaction.
     *
     * @param  list<DomainEvent>  $events
     */
    public function flush(array $events): void;
}
