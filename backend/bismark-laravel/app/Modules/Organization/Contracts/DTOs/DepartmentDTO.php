<?php

declare(strict_types=1);

namespace App\Modules\Organization\Contracts\DTOs;

final class DepartmentDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $tenantId,
        public readonly ?string $name,
        public readonly ?string $code,
        public readonly ?string $branchId,
        public readonly ?string $parentId,
        public readonly ?bool $isActive,
        public readonly ?\DateTimeImmutable $createdAt,
        public readonly ?\DateTimeImmutable $updatedAt,
    ) {
    }
}
