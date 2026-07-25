<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts\DTOs;

final class PermissionDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $key,
        public readonly ?string $module,
        public readonly ?string $action,
        public readonly ?string $description,
        public readonly ?bool $isSystem,
        public readonly ?\DateTimeImmutable $createdAt,
    ) {
    }
}
