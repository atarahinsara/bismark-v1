<?php

declare(strict_types=1);

namespace App\Modules\Party\Contracts\DTOs;

use App\Modules\Party\Enums\PartyStatus;
use App\Modules\Party\Enums\PartyType;

final class PartyDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $tenantId,
        public readonly ?string $businessCode,
        public readonly ?PartyType $partyType,
        public readonly ?string $displayName,
        public readonly ?PartyStatus $status,
        public readonly ?string $taxId,
        public readonly ?string $registrationNo,
        /** @var array<string, mixed>|null */
        public readonly ?array $metadata,
        public readonly ?\DateTimeImmutable $createdAt,
        public readonly ?\DateTimeImmutable $updatedAt,
    ) {
    }
}
