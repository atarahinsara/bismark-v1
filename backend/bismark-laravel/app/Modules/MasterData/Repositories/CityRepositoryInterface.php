<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\City;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface CityRepositoryInterface
{
    public function find(string $id): ?City;

    public function findOrFail(string $id): City;

    public function forProvince(string $provinceId): Collection;

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator;
}
