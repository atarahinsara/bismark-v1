<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\City;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

final class CityRepository extends Repository
{
    protected function modelClass(): string
    {
        return City::class;
    }

    public function forProvince(string $provinceId): Collection
    {
        return City::query()->where('province_id', $provinceId)->orderBy('name')->get();
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return City::query()
            ->when($filters['province_id'] ?? null, fn ($q, $v) => $q->where('province_id', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('name_fa', 'ilike', "%{$v}%"))
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
