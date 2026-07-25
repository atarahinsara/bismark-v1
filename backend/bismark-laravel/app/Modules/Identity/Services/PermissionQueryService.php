<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\PermissionDTO;
use App\Modules\Identity\Contracts\PermissionQueryServiceInterface;
use App\Modules\Identity\Models\Permission;
use App\Modules\Identity\Repositories\PermissionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

final class PermissionQueryService implements PermissionQueryServiceInterface
{
    public function __construct(
        private readonly PermissionRepositoryInterface $permissions,
    ) {
    }

    public function find(string $id): ?PermissionDTO
    {
        $p = $this->permissions->find($id);
        return $p ? $this->toDTO($p) : null;
    }

    public function findByKey(string $key): ?PermissionDTO
    {
        $p = $this->permissions->findByKey($key);
        return $p ? $this->toDTO($p) : null;
    }

    public function all(): Collection
    {
        return $this->permissions->all()->map(fn (Permission $p) => $this->toDTO($p));
    }

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator {
        return $this->permissions->paginate($page, $perPage, $filters);
    }

    private function toDTO(Permission $p): PermissionDTO
    {
        return new PermissionDTO(
            id: $p->id,
            key: $p->key,
            module: $p->module,
            action: $p->action,
            description: $p->description,
            isSystem: $p->is_system,
            createdAt: $p->created_at?->toImmutable(),
        );
    }
}
