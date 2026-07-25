<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Contracts\DTOs;

final class CityDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $provinceId,
        public readonly ?string $code,
        public readonly ?string $name,
        public readonly ?string $nameFa,
        public readonly ?bool $isActive,
    ) {
    }
}
