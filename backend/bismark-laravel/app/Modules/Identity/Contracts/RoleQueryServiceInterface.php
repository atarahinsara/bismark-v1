<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\RoleDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface RoleQueryServiceInterface
{
    public function find(string $id): ?RoleDTO;

    public function findByKey(string $key): ?RoleDTO;

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;
}
