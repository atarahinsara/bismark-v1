<?php

declare(strict_types=1);

namespace App\Modules\Organization\Events;

use App\Shared\Kernel\Domain\DomainEvent;
use DateTimeImmutable;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

abstract class AbstractDepartmentEvent implements DomainEvent
{
    private readonly UuidInterface $eventId;
    private readonly DateTimeImmutable $occurredAt;

    final public function __construct(
        protected readonly string $departmentId,
        protected readonly ?string $tenantId = null,
    ) {
        $this->eventId    = Uuid::uuid7();
        $this->occurredAt = new DateTimeImmutable();
    }

    public function eventId(): UuidInterface { return $this->eventId; }
    public function aggregateId(): string { return $this->departmentId; }
    public function aggregateType(): string { return 'Department'; }
    public function occurredAt(): DateTimeImmutable { return $this->occurredAt; }
    public function eventVersion(): int { return 1; }

    public function toPayload(): array
    {
        return ['department_id' => $this->departmentId, 'tenant_id' => $this->tenantId];
    }
}
