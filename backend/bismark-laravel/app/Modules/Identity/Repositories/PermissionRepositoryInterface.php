<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\Permission;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface PermissionRepositoryInterface
{
    public function find(string $id): ?Permission;

    public function findOrFail(string $id): Permission;

    public function findByKey(string $key): ?Permission;

    public function all(): Collection;

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator;
}
