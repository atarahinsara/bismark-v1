<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\Currency;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CurrencyRepositoryInterface
{
    public function find(string $id): ?Currency;

    public function findOrFail(string $id): Currency;

    public function findByCode(string $code): ?Currency;

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator;
}
