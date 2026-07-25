<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\Session;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface SessionRepositoryInterface
{
    public function find(string $id): ?Session;

    public function findOrFail(string $id): Session;

    public function paginateForTenant(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;

    /** @return list<Session> */
    public function activeSessionsForUser(string $userId): array;

    public function save(Session $model): bool;
}
