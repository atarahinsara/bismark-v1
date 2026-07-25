<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Enums\SessionStatus;
use App\Modules\Identity\Models\Session;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class SessionRepository extends Repository
{
    protected function modelClass(): string
    {
        return Session::class;
    }

    public function paginateForTenant(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        return Session::forTenant($tenantId)
            ->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->latest('issued_at')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function activeSessionsForUser(string $userId): array
    {
        return Session::query()
            ->where('user_id', $userId)
            ->where('status', SessionStatus::Active)
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->get()
            ->all();
    }
}
