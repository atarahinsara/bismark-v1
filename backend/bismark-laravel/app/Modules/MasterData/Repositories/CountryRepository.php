<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\Country;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class CountryRepository extends Repository
{
    protected function modelClass(): string
    {
        return Country::class;
    }

    public function findByIso(string $iso): ?Country
    {
        /** @var Country|null $c */
        $c = Country::query()->where('iso_code', strtoupper($iso))->first();
        return $c;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return Country::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('name_fa', 'ilike', "%{$v}%")
                ->orWhere('iso_code', 'ilike', "%{$v}%"))
            ->when(isset($filters['is_active']), fn ($q) => $q->where('is_active', $filters['is_active']))
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
