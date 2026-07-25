<?php

declare(strict_types=1);

namespace App\Modules\Identity\Events;

use App\Shared\Kernel\Domain\DomainEvent;
use DateTimeImmutable;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

/**
 * Generic base class for User-related domain events.
 *
 * Each subclass overrides eventType()/eventVersion()/toPayload(). The base
 * handles id/timestamp/aggregate plumbing.
 */
abstract class AbstractUserEvent implements DomainEvent
{
    private readonly UuidInterface $eventId;
    private readonly DateTimeImmutable $occurredAt;

    final public function __construct(
        protected readonly string $userId,
        protected readonly ?string $tenantId = null,
    ) {
        $this->eventId    = Uuid::uuid7();
        $this->occurredAt = new DateTimeImmutable();
    }

    public function eventId(): UuidInterface
    {
        return $this->eventId;
    }

    public function aggregateId(): string
    {
        return $this->userId;
    }

    public function aggregateType(): string
    {
        return 'User';
    }

    public function occurredAt(): DateTimeImmutable
    {
        return $this->occurredAt;
    }

    public function eventVersion(): int
    {
        return 1;
    }

    public function toPayload(): array
    {
        return [
            'user_id'   => $this->userId,
            'tenant_id' => $this->tenantId,
        ];
    }
}
