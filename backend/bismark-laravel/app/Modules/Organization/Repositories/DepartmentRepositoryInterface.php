<?php

declare(strict_types=1);

namespace App\Modules\Organization\Repositories;

use App\Modules\Organization\Models\Department;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface DepartmentRepositoryInterface
{
    public function find(string $id): ?Department;

    public function findOrFail(string $id): Department;

    public function findByCode(string $tenantId, string $code): ?Department;

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;

    public function save(Department $model): bool;

    public function delete(Department $model): bool;
}
