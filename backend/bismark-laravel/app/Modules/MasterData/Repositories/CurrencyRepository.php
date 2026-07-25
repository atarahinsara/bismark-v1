<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\Currency;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class CurrencyRepository extends Repository
{
    protected function modelClass(): string
    {
        return Currency::class;
    }

    public function findByCode(string $code): ?Currency
    {
        /** @var Currency|null $c */
        $c = Currency::query()->where('code', strtoupper($code))->first();
        return $c;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return Currency::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('code', 'ilike', "%{$v}%"))
            ->orderBy('code')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
