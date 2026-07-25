<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Contracts\BranchCommandServiceInterface;
use App\Modules\Organization\Contracts\DTOs\BranchDTO;
use App\Modules\Organization\Events\BranchCreated;
use App\Modules\Organization\Events\BranchDeleted;
use App\Modules\Organization\Events\BranchUpdated;
use App\Modules\Organization\Models\Branch;
use App\Modules\Organization\Repositories\BranchRepositoryInterface;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;

final class BranchCommandService implements BranchCommandServiceInterface
{
    public function __construct(
        private readonly BranchRepositoryInterface $branches,
        private readonly EventBusInterface $bus,
    ) {
    }

    public function create(BranchDTO $payload): BranchDTO
    {
        $tenantId = $payload->tenantId ?? (string) App::make('bismark.tenant');

        return DB::transaction(function () use ($payload, $tenantId): BranchDTO {
            $b = new Branch();
            $b->id            = UuidV7Generator::generateString();
            $b->tenant_id     = $tenantId;
            $b->name          = $payload->name ?? throw new \InvalidArgumentException('name required');
            $b->code          = $payload->code ?? throw new \InvalidArgumentException('code required');
            $b->parent_id     = $payload->parentId;
            $b->address       = $payload->address;
            $b->contact_phone = $payload->contactPhone;
            $b->is_active     = $payload->isActive ?? true;

            $this->branches->save($b);

            $this->bus->flush([new BranchCreated($b->id, $tenantId)]);

            return $this->toDTO($b);
        });
    }

    public function update(string $id, BranchDTO $payload): BranchDTO
    {
        return DB::transaction(function () use ($id, $payload): BranchDTO {
            $b = $this->branches->findOrFail($id);

            if ($payload->name !== null) $b->name = $payload->name;
            if ($payload->parentId !== null) $b->parent_id = $payload->parentId;
            if ($payload->address !== null) $b->address = $payload->address;
            if ($payload->contactPhone !== null) $b->contact_phone = $payload->contactPhone;
            if ($payload->isActive !== null) $b->is_active = $payload->isActive;

            $this->branches->save($b);

            $this->bus->flush([new BranchUpdated($b->id, $b->tenant_id)]);

            return $this->toDTO($b);
        });
    }

    public function delete(string $id): void
    {
        DB::transaction(function () use ($id): void {
            $b = $this->branches->findOrFail($id);
            $this->branches->delete($b);
            $this->bus->flush([new BranchDeleted($b->id, $b->tenant_id)]);
        });
    }

    private function toDTO(Branch $b): BranchDTO
    {
        return new BranchDTO(
            id: $b->id,
            tenantId: $b->tenant_id,
            name: $b->name,
            code: $b->code,
            parentId: $b->parent_id,
            address: $b->address,
            contactPhone: $b->contact_phone,
            isActive: (bool) $b->is_active,
            createdAt: $b->created_at?->toImmutable(),
            updatedAt: $b->updated_at?->toImmutable(),
        );
    }
}
