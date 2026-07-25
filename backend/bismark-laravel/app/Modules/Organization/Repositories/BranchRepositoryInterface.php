<?php

declare(strict_types=1);

namespace App\Modules\Organization\Repositories;

use App\Modules\Organization\Models\Branch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface BranchRepositoryInterface
{
    public function find(string $id): ?Branch;

    public function findOrFail(string $id): Branch;

    public function findByCode(string $tenantId, string $code): ?Branch;

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;

    public function save(Branch $model): bool;

    public function delete(Branch $model): bool;
}
