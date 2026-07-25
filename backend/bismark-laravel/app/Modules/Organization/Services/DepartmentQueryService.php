<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Contracts\DepartmentQueryServiceInterface;
use App\Modules\Organization\Contracts\DTOs\DepartmentDTO;
use App\Modules\Organization\Models\Department;
use App\Modules\Organization\Repositories\DepartmentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\App;

final class DepartmentQueryService implements DepartmentQueryServiceInterface
{
    public function __construct(
        private readonly DepartmentRepositoryInterface $departments,
    ) {
    }

    public function find(string $id): ?DepartmentDTO
    {
        $d = $this->departments->find($id);
        return $d ? $this->toDTO($d) : null;
    }

    public function findByCode(string $code): ?DepartmentDTO
    {
        $tenantId = (string) App::make('bismark.tenant');
        $d = $this->departments->findByCode($tenantId, $code);
        return $d ? $this->toDTO($d) : null;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        $tenantId = (string) App::make('bismark.tenant');
        return $this->departments->paginate($tenantId, $page, $perPage, $filters);
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
