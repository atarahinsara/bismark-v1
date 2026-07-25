<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\PermissionDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface PermissionQueryServiceInterface
{
    public function find(string $id): ?PermissionDTO;

    public function findByKey(string $key): ?PermissionDTO;

    public function all(): Collection;

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator;
}
