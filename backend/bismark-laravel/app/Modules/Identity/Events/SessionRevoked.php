<?php

declare(strict_types=1);

namespace App\Modules\Identity\Events;

use App\Shared\Kernel\Domain\DomainEvent;
use DateTimeImmutable;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

final class SessionRevoked implements DomainEvent
{
    private readonly UuidInterface $eventId;
    private readonly DateTimeImmutable $occurredAt;

    public function __construct(
        private readonly string $sessionId,
        private readonly string $userId,
        private readonly ?string $tenantId,
        private readonly ?string $reason,
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
        return $this->sessionId;
    }

    public function aggregateType(): string
    {
        return 'Session';
    }

    public function eventType(): string
    {
        return 'identity.session.revoked';
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
            'session_id' => $this->sessionId,
            'user_id'    => $this->userId,
            'tenant_id'  => $this->tenantId,
            'reason'     => $this->reason,
        ];
    }
}
