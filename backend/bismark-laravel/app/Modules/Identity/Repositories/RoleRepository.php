<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\Role;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class RoleRepository extends Repository
{
    protected function modelClass(): string
    {
        return Role::class;
    }

    public function findByKey(string $tenantId, string $key): ?Role
    {
        /** @var Role|null $r */
        $r = Role::forTenant($tenantId)->where('key', $key)->first();
        return $r;
    }

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        return Role::forTenant($tenantId)
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('name', 'ilike', "%{$v}%")
                ->orWhere('key', 'ilike', "%{$v}%"))
            ->latest()
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
