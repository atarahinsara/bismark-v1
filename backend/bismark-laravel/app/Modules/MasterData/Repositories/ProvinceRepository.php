<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\Province;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

final class ProvinceRepository extends Repository
{
    protected function modelClass(): string
    {
        return Province::class;
    }

    public function forCountry(string $countryId): Collection
    {
        return Province::query()->where('country_id', $countryId)->orderBy('name')->get();
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return Province::query()
            ->when($filters['country_id'] ?? null, fn ($q, $v) => $q->where('country_id', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('name_fa', 'ilike', "%{$v}%"))
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
