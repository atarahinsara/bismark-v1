<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\Permission;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

final class PermissionRepository extends Repository
{
    protected function modelClass(): string
    {
        return Permission::class;
    }

    public function findByKey(string $key): ?Permission
    {
        /** @var Permission|null $p */
        $p = Permission::query()->where('key', $key)->first();
        return $p;
    }

    public function all(): Collection
    {
        return Permission::query()->orderBy('module')->orderBy('action')->get();
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return Permission::query()
            ->when($filters['module'] ?? null, fn ($q, $v) => $q->where('module', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q
                ->where('key', 'ilike', "%{$v}%")
                ->orWhere('description', 'ilike', "%{$v}%"))
            ->orderBy('module')
            ->orderBy('action')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
