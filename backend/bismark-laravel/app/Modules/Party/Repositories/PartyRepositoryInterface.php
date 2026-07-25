<?php

declare(strict_types=1);

namespace App\Modules\Party\Repositories;

use App\Modules\Party\Models\Party;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PartyRepositoryInterface
{
    public function find(string $id): ?Party;

    public function findOrFail(string $id): Party;

    public function findByBusinessCode(string $tenantId, string $businessCode): ?Party;

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;

    public function save(Party $model): bool;

    public function delete(Party $model): bool;
}
