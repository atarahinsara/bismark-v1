<?php

declare(strict_types=1);

namespace App\Modules\Organization\Repositories;

use App\Modules\Organization\Models\Branch;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class BranchRepository extends Repository
{
    protected function modelClass(): string
    {
        return Branch::class;
    }

    public function findByCode(string $tenantId, string $code): ?Branch
    {
        /** @var Branch|null $b */
        $b = Branch::forTenant($tenantId)->where('code', $code)->first();
        return $b;
    }

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        return Branch::forTenant($tenantId)
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('code', 'ilike', "%{$v}%"))
            ->when($filters['parent_id'] ?? null, fn ($q, $v) => $q->where('parent_id', $v))
            ->latest()
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
