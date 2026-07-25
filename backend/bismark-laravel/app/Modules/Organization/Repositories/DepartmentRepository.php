<?php

declare(strict_types=1);

namespace App\Modules\Organization\Repositories;

use App\Modules\Organization\Models\Department;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class DepartmentRepository extends Repository
{
    protected function modelClass(): string
    {
        return Department::class;
    }

    public function findByCode(string $tenantId, string $code): ?Department
    {
        /** @var Department|null $d */
        $d = Department::forTenant($tenantId)->where('code', $code)->first();
        return $d;
    }

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        return Department::forTenant($tenantId)
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('code', 'ilike', "%{$v}%"))
            ->when($filters['branch_id'] ?? null, fn ($q, $v) => $q->where('branch_id', $v))
            ->latest()
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
