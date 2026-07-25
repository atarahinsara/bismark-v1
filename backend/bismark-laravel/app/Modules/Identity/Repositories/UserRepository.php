<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\User;
use App\Shared\Kernel\Concerns\BelongsToTenant;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * User Repository — data access layer for User aggregate.
 *
 * Architecture Laws:
 * - LAW-01: No cross-context JOINs in queries
 * - LAW-03: This repository is ONLY accessible from within Identity Context
 *           (enforced by EnforceLaw03). Other contexts use UserQueryServiceInterface Contract.
 * - Always filters by tenant_id (ADR-003: Multi-Tenant)
 */
final class UserRepository
{
    public function __construct()
    {
        // Runtime LAW-03 check (non-production only; static analysis in CI for production)
        \App\Shared\Infrastructure\Law\EnforceLaw03::assertRepositoryAccess(self::class);
    }

    /**
     * Find a user by ID within a tenant.
     */
    public function find(string $tenantId, string $id): ?User
    {
        return User::forTenant($tenantId)->where('id', $id)->first();
    }

    /**
     * Find a user by ID or fail.
     */
    public function findOrFail(string $tenantId, string $id): User
    {
        return User::forTenant($tenantId)->where('id', $id)->firstOrFail();
    }

    /**
     * Find by username within a tenant.
     */
    public function findByUsername(string $tenantId, string $username): ?User
    {
        return User::forTenant($tenantId)->where('username', $username)->first();
    }

    /**
     * Find by email within a tenant.
     */
    public function findByEmail(string $tenantId, string $email): ?User
    {
        return User::forTenant($tenantId)->where('email', $email)->first();
    }

    /**
     * Paginated list with filters.
     *
     * @param array{status?: string, user_type?: string, search?: string} $filters
     */
    public function paginate(
        string $tenantId,
        array $filters = [],
        int $perPage = 20,
        int $page = 1,
        string $sort = '-created_at',
    ): LengthAwarePaginator {
        $query = User::forTenant($tenantId);

        // Filters
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['user_type'])) {
            $query->where('user_type', $filters['user_type']);
        }
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('username', 'ILIKE', "%{$search}%")
                  ->orWhere('display_name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        // Sort
        $sortDir = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $sortCol = ltrim($sort, '-');
        $allowedSorts = ['created_at', 'updated_at', 'username', 'display_name', 'last_login_at'];
        if (in_array($sortCol, $allowedSorts, true)) {
            $query->orderBy($sortCol, $sortDir);
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Create a new user.
     *
     * @param array<string, mixed> $data
     */
    public function create(array $data): User
    {
        $data['id'] = $data['id'] ?? \App\Shared\Kernel\Support\UuidV7Generator::generate();
        return User::create($data);
    }

    /**
     * Update a user.
     *
     * @param array<string, mixed> $data
     */
    public function update(User $user, array $data): User
    {
        $user->update($data);
        return $user->fresh();
    }

    /**
     * Soft delete a user.
     */
    public function delete(User $user): void
    {
        $user->delete();
    }

    /**
     * Get users by role key.
     */
    public function getByRole(string $tenantId, string $roleKey): Collection
    {
        return User::forTenant($tenantId)
            ->whereHas('roles', fn (Builder $q) => $q->where('key', $roleKey))
            ->get();
    }

    /**
     * Count active users in a tenant.
     */
    public function countActive(string $tenantId): int
    {
        return User::forTenant($tenantId)->active()->count();
    }
}
