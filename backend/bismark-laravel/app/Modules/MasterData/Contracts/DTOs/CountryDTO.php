<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Contracts\DTOs;

final class CountryDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $isoCode,
        public readonly ?string $iso3Code,
        public readonly ?string $name,
        public readonly ?string $nameFa,
        public readonly ?string $phoneCode,
        public readonly ?string $currencyCode,
        public readonly ?bool $isActive,
    ) {
    }
}
