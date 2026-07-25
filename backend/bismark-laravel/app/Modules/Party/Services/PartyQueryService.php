<?php

declare(strict_types=1);

namespace App\Modules\Party\Services;

use App\Modules\Party\Contracts\DTOs\PartyDTO;
use App\Modules\Party\Contracts\PartyQueryServiceInterface;
use App\Modules\Party\Models\Party;
use App\Modules\Party\Repositories\PartyRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\App;

final class PartyQueryService implements PartyQueryServiceInterface
{
    public function __construct(
        private readonly PartyRepositoryInterface $parties,
    ) {
    }

    public function find(string $id): ?PartyDTO
    {
        $p = $this->parties->find($id);
        return $p ? $this->toDTO($p) : null;
    }

    public function findByBusinessCode(string $businessCode): ?PartyDTO
    {
        $tenantId = (string) App::make('bismark.tenant');
        $p = $this->parties->findByBusinessCode($tenantId, $businessCode);
        return $p ? $this->toDTO($p) : null;
    }

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator {
        $tenantId = (string) App::make('bismark.tenant');
        return $this->parties->paginate($tenantId, $page, $perPage, $filters);
    }

    private function toDTO(Party $p): PartyDTO
    {
        return new PartyDTO(
            id: $p->id,
            tenantId: $p->tenant_id,
            businessCode: $p->business_code,
            partyType: $p->party_type,
            displayName: $p->display_name,
            status: $p->status,
            taxId: $p->tax_id,
            registrationNo: $p->registration_no,
            metadata: $p->metadata,
            createdAt: $p->created_at?->toImmutable(),
            updatedAt: $p->updated_at?->toImmutable(),
        );
    }
}
