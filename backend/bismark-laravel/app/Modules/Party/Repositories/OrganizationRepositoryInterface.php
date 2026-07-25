<?php

declare(strict_types=1);

namespace App\Modules\Party\Repositories;

use App\Modules\Party\Models\Organization;

interface OrganizationRepositoryInterface
{
    public function find(string $id): ?Organization;

    public function findOrFail(string $id): Organization;

    public function findByPartyId(string $partyId): ?Organization;

    public function save(Organization $model): bool;

    public function delete(Organization $model): bool;
}
