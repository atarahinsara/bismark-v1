<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\RoleDTO;
use App\Modules\Identity\Contracts\RoleQueryServiceInterface;
use App\Modules\Identity\Models\Role;
use App\Modules\Identity\Repositories\RoleRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\App;

final class RoleQueryService implements RoleQueryServiceInterface
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles,
    ) {
    }

    public function find(string $id): ?RoleDTO
    {
        $role = $this->roles->find($id);
        return $role ? $this->toDTO($role) : null;
    }

    public function findByKey(string $key): ?RoleDTO
    {
        $tenantId = (string) App::make('bismark.tenant');
        $role = $this->roles->findByKey($tenantId, $key);
        return $role ? $this->toDTO($role) : null;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        $tenantId = (string) App::make('bismark.tenant');
        return $this->roles->paginate($tenantId, $page, $perPage, $filters);
    }

    private function toDTO(Role $role): RoleDTO
    {
        return new RoleDTO(
            id: $role->id,
            tenantId: $role->tenant_id,
            key: $role->key,
            name: $role->name,
            description: $role->description,
            isSystem: $role->is_system,
            createdAt: $role->created_at?->toImmutable(),
            updatedAt: $role->updated_at?->toImmutable(),
        );
    }
}
