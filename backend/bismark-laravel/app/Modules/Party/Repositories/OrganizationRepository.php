<?php

declare(strict_types=1);

namespace App\Modules\Party\Repositories;

use App\Modules\Party\Models\Organization;
use App\Shared\Kernel\Domain\Repository;

final class OrganizationRepository extends Repository
{
    protected function modelClass(): string
    {
        return Organization::class;
    }

    public function findByPartyId(string $partyId): ?Organization
    {
        /** @var Organization|null $o */
        $o = Organization::query()->where('party_id', $partyId)->first();
        return $o;
    }
}
