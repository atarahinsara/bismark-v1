<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts\DTOs;

final class RoleDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $tenantId,
        public readonly ?string $key,
        public readonly ?string $name,
        public readonly ?string $description,
        public readonly ?bool $isSystem,
        public readonly ?\DateTimeImmutable $createdAt,
        public readonly ?\DateTimeImmutable $updatedAt,
    ) {
    }
}
