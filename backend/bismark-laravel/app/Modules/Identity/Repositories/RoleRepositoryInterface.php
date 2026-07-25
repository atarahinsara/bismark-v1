<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\Role;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface RoleRepositoryInterface
{
    public function find(string $id): ?Role;

    public function findOrFail(string $id): Role;

    public function findByKey(string $tenantId, string $key): ?Role;

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;

    public function save(Role $model): bool;

    public function delete(Role $model): bool;
}
