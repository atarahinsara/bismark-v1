<?php

declare(strict_types=1);

namespace App\Modules\Organization\Contracts;

use App\Modules\Organization\Contracts\DTOs\BranchDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface BranchQueryServiceInterface
{
    public function find(string $id): ?BranchDTO;

    public function findByCode(string $code): ?BranchDTO;

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;
}
