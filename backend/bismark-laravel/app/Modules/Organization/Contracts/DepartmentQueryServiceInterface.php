<?php

declare(strict_types=1);

namespace App\Modules\Organization\Contracts;

use App\Modules\Organization\Contracts\DTOs\DepartmentDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface DepartmentQueryServiceInterface
{
    public function find(string $id): ?DepartmentDTO;

    public function findByCode(string $code): ?DepartmentDTO;

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;
}
