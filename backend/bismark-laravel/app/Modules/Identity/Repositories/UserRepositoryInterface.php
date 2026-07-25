<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface UserRepositoryInterface
{
    public function find(string $id): ?User;

    public function findOrFail(string $id): User;

    public function findByUsername(string $tenantId, string $username): ?User;

    public function findByEmail(string $tenantId, string $email): ?User;

    /**
     * @param  array{status?: string, user_type?: string, search?: string}  $filters
     */
    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;

    public function activeForTenant(string $tenantId): Collection;

    public function save(User $model): bool;

    public function delete(User $model): bool;
}
