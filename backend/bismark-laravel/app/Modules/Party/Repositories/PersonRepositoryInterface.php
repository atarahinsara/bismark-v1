<?php

declare(strict_types=1);

namespace App\Modules\Party\Repositories;

use App\Modules\Party\Models\Person;

interface PersonRepositoryInterface
{
    public function find(string $id): ?Person;

    public function findOrFail(string $id): Person;

    public function findByPartyId(string $partyId): ?Person;

    public function save(Person $model): bool;

    public function delete(Person $model): bool;
}
