<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Contracts\DepartmentCommandServiceInterface;
use App\Modules\Organization\Contracts\DTOs\DepartmentDTO;
use App\Modules\Organization\Events\DepartmentCreated;
use App\Modules\Organization\Events\DepartmentDeleted;
use App\Modules\Organization\Events\DepartmentUpdated;
use App\Modules\Organization\Models\Department;
use App\Modules\Organization\Repositories\DepartmentRepositoryInterface;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;

final class DepartmentCommandService implements DepartmentCommandServiceInterface
{
    public function __construct(
        private readonly DepartmentRepositoryInterface $departments,
        private readonly EventBusInterface $bus,
    ) {
    }

    public function create(DepartmentDTO $payload): DepartmentDTO
    {
        $tenantId = $payload->tenantId ?? (string) App::make('bismark.tenant');

        return DB::transaction(function () use ($payload, $tenantId): DepartmentDTO {
            $d = new Department();
            $d->id         = UuidV7Generator::generateString();
            $d->tenant_id  = $tenantId;
            $d->name       = $payload->name ?? throw new \InvalidArgumentException('name required');
            $d->code       = $payload->code ?? throw new \InvalidArgumentException('code required');
            $d->branch_id  = $payload->branchId;
            $d->parent_id  = $payload->parentId;
            $d->is_active  = $payload->isActive ?? true;

            $this->departments->save($d);

            $this->bus->flush([new DepartmentCreated($d->id, $tenantId)]);

            return $this->toDTO($d);
        });
    }

    public function update(string $id, DepartmentDTO $payload): DepartmentDTO
    {
        return DB::transaction(function () use ($id, $payload): DepartmentDTO {
            $d = $this->departments->findOrFail($id);

            if ($payload->name !== null) $d->name = $payload->name;
            if ($payload->branchId !== null) $d->branch_id = $payload->branchId;
            if ($payload->parentId !== null) $d->parent_id = $payload->parentId;
            if ($payload->isActive !== null) $d->is_active = $payload->isActive;

            $this->departments->save($d);

            $this->bus->flush([new DepartmentUpdated($d->id, $d->tenant_id)]);

            return $this->toDTO($d);
        });
    }

    public function delete(string $id): void
    {
        DB::transaction(function () use ($id): void {
            $d = $this->departments->findOrFail($id);
            $this->departments->delete($d);
            $this->bus->flush([new DepartmentDeleted($d->id, $d->tenant_id)]);
        });
    }

    private function toDTO(Department $d): DepartmentDTO
    {
        return new DepartmentDTO(
            id: $d->id,
            tenantId: $d->tenant_id,
            name: $d->name,
            code: $d->code,
            branchId: $d->branch_id,
            parentId: $d->parent_id,
            isActive: (bool) $d->is_active,
            createdAt: $d->created_at?->toImmutable(),
            updatedAt: $d->updated_at?->toImmutable(),
        );
    }
}
