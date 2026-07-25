<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\SessionDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface SessionQueryServiceInterface
{
    public function find(string $id): ?SessionDTO;

    public function paginateForUser(
        string $userId,
        int $page = 1,
        int $perPage = 20,
    ): LengthAwarePaginator;
}
