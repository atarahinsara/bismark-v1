<?php

declare(strict_types=1);

namespace App\Modules\Party\Services;

use App\Modules\Party\Contracts\DTOs\PartyDTO;
use App\Modules\Party\Contracts\PartyCommandServiceInterface;
use App\Modules\Party\Enums\PartyStatus;
use App\Modules\Party\Events\PartyCreated;
use App\Modules\Party\Events\PartyDeleted;
use App\Modules\Party\Events\PartyUpdated;
use App\Modules\Party\Models\Party;
use App\Modules\Party\Repositories\PartyRepositoryInterface;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\BusinessCodeGenerator;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;

/**
 * PartyCommandService — LAW-02 compliant: every created Party receives a
 * business_code generated through BusinessCodeGenerator.
 */
final class PartyCommandService implements PartyCommandServiceInterface
{
    public function __construct(
        private readonly PartyRepositoryInterface $parties,
        private readonly EventBusInterface $bus,
        private readonly BusinessCodeGenerator $codeGenerator,
    ) {
    }

    public function create(PartyDTO $payload): PartyDTO
    {
        $tenantId = $payload->tenantId ?? (string) App::make('bismark.tenant');

        return DB::transaction(function () use ($payload, $tenantId): PartyDTO {
            $party = new Party();
            $party->id             = UuidV7Generator::generateString();
            $party->tenant_id      = $tenantId;
            // LAW-02: generate business_code via the generator.
            $party->business_code  = $this->codeGenerator->generate('Party', $tenantId);
            $party->party_type     = $payload->partyType
                ?? throw new \InvalidArgumentException('partyType required');
            $party->display_name   = $payload->displayName
                ?? throw new \InvalidArgumentException('displayName required');
            $party->status         = $payload->status ?? PartyStatus::Active;
            $party->tax_id         = $payload->taxId;
            $party->registration_no= $payload->registrationNo;
            $party->metadata       = $payload->metadata ?? [];

            $this->parties->save($party);

            $this->bus->flush([
                new PartyCreated($party->id, $tenantId, $party->business_code),
            ]);

            return $this->toDTO($party);
        });
    }

    public function update(string $id, PartyDTO $payload): PartyDTO
    {
        return DB::transaction(function () use ($id, $payload): PartyDTO {
            $party = $this->parties->findOrFail($id);

            // business_code is immutable after create (LAW-02 invariant).
            if ($payload->displayName !== null) $party->display_name = $payload->displayName;
            if ($payload->status !== null) $party->status = $payload->status;
            if ($payload->taxId !== null) $party->tax_id = $payload->taxId;
            if ($payload->registrationNo !== null) $party->registration_no = $payload->registrationNo;
            if ($payload->metadata !== null) $party->metadata = $payload->metadata;

            $this->parties->save($party);

            $this->bus->flush([new PartyUpdated($party->id, $party->tenant_id, $party->business_code)]);

            return $this->toDTO($party);
        });
    }

    public function delete(string $id): void
    {
        DB::transaction(function () use ($id): void {
            $party = $this->parties->findOrFail($id);
            $this->parties->delete($party);
            $this->bus->flush([new PartyDeleted($party->id, $party->tenant_id, $party->business_code)]);
        });
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
