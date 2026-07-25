<?php

declare(strict_types=1);

namespace App\Modules\Party\Events;

use App\Shared\Kernel\Domain\DomainEvent;
use DateTimeImmutable;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

abstract class AbstractPartyEvent implements DomainEvent
{
    private readonly UuidInterface $eventId;
    private readonly DateTimeImmutable $occurredAt;

    final public function __construct(
        protected readonly string $partyId,
        protected readonly ?string $tenantId = null,
        protected readonly ?string $businessCode = null,
    ) {
        $this->eventId    = Uuid::uuid7();
        $this->occurredAt = new DateTimeImmutable();
    }

    public function eventId(): UuidInterface { return $this->eventId; }
    public function aggregateId(): string { return $this->partyId; }
    public function aggregateType(): string { return 'Party'; }
    public function occurredAt(): DateTimeImmutable { return $this->occurredAt; }
    public function eventVersion(): int { return 1; }

    public function toPayload(): array
    {
        return [
            'party_id'      => $this->partyId,
            'tenant_id'     => $this->tenantId,
            'business_code' => $this->businessCode,
        ];
    }
}
