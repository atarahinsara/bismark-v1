<?php

declare(strict_types=1);

namespace App\Modules\Organization\Contracts\DTOs;

final class BranchDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $tenantId,
        public readonly ?string $name,
        public readonly ?string $code,
        public readonly ?string $parentId,
        /** @var array<string, mixed>|null */
        public readonly ?array $address,
        public readonly ?string $contactPhone,
        public readonly ?bool $isActive,
        public readonly ?\DateTimeImmutable $createdAt,
        public readonly ?\DateTimeImmutable $updatedAt,
    ) {
    }
}
