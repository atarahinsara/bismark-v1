<?php

declare(strict_types=1);

namespace App\Modules\Party\Repositories;

use App\Modules\Party\Models\Party;
use App\Shared\Kernel\Domain\Repository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class PartyRepository extends Repository
{
    protected function modelClass(): string
    {
        return Party::class;
    }

    public function findByBusinessCode(string $tenantId, string $businessCode): ?Party
    {
        /** @var Party|null $p */
        $p = Party::forTenant($tenantId)->where('business_code', $businessCode)->first();
        return $p;
    }

    public function paginate(
        string $tenantId,
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        return Party::forTenant($tenantId)
            ->when($filters['party_type'] ?? null, fn ($q, $v) => $q->where('party_type', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['search'] ?? null, function ($q, $v): void {
                $q->where(fn ($qq) => $qq
                    ->where('display_name', 'ilike', "%{$v}%")
                    ->orWhere('business_code', 'ilike', "%{$v}%")
                    ->orWhere('tax_id', 'ilike', "%{$v}%"));
            })
            ->latest()
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
