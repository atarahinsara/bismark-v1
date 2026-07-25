<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\Language;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class LanguageRepository extends Repository
{
    protected function modelClass(): string
    {
        return Language::class;
    }

    public function findByCode(string $code): ?Language
    {
        /** @var Language|null $l */
        $l = Language::query()->where('code', $code)->first();
        return $l;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return Language::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('code', 'ilike', "%{$v}%"))
            ->orderBy('code')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
