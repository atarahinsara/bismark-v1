<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\RoleDTO;
use App\Modules\Identity\Contracts\RoleCommandServiceInterface;
use App\Modules\Identity\Events\RoleCreated;
use App\Modules\Identity\Events\RoleDeleted;
use App\Modules\Identity\Events\RoleUpdated;
use App\Modules\Identity\Models\Role;
use App\Modules\Identity\Repositories\RoleRepositoryInterface;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;

final class RoleCommandService implements RoleCommandServiceInterface
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles,
        private readonly EventBusInterface $bus,
    ) {
    }

    public function create(RoleDTO $payload): RoleDTO
    {
        $tenantId = $payload->tenantId ?? (string) App::make('bismark.tenant');

        return DB::transaction(function () use ($payload, $tenantId): RoleDTO {
            $role = new Role();
            $role->id          = UuidV7Generator::generateString();
            $role->tenant_id   = $tenantId;
            $role->key         = $payload->key ?? throw new \InvalidArgumentException('key required');
            $role->name        = $payload->name ?? throw new \InvalidArgumentException('name required');
            $role->description = $payload->description;
            $role->is_system   = $payload->isSystem ?? false;

            $this->roles->save($role);

            $this->bus->flush([new RoleCreated($role->id, $tenantId)]);

            return $this->toDTO($role);
        });
    }

    public function update(string $id, RoleDTO $payload): RoleDTO
    {
        return DB::transaction(function () use ($id, $payload): RoleDTO {
            $role = $this->roles->findOrFail($id);
            if ($role->is_system) {
                throw new \DomainException('System roles are immutable.');
            }

            if ($payload->name !== null) {
                $role->name = $payload->name;
            }
            if ($payload->description !== null) {
                $role->description = $payload->description;
            }

            $this->roles->save($role);

            $this->bus->flush([new RoleUpdated($role->id, $role->tenant_id)]);

            return $this->toDTO($role);
        });
    }

    public function delete(string $id): void
    {
        DB::transaction(function () use ($id): void {
            $role = $this->roles->findOrFail($id);
            if ($role->is_system) {
                throw new \DomainException('System roles cannot be deleted.');
            }
            $this->roles->delete($role);
            $this->bus->flush([new RoleDeleted($role->id, $role->tenant_id)]);
        });
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
