<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Contracts\BranchQueryServiceInterface;
use App\Modules\Organization\Contracts\DTOs\BranchDTO;
use App\Modules\Organization\Models\Branch;
use App\Modules\Organization\Repositories\BranchRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\App;

final class BranchQueryService implements BranchQueryServiceInterface
{
    public function __construct(
        private readonly BranchRepositoryInterface $branches,
    ) {
    }

    public function find(string $id): ?BranchDTO
    {
        $b = $this->branches->find($id);
        return $b ? $this->toDTO($b) : null;
    }

    public function findByCode(string $code): ?BranchDTO
    {
        $tenantId = (string) App::make('bismark.tenant');
        $b = $this->branches->findByCode($tenantId, $code);
        return $b ? $this->toDTO($b) : null;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        $tenantId = (string) App::make('bismark.tenant');
        return $this->branches->paginate($tenantId, $page, $perPage, $filters);
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
