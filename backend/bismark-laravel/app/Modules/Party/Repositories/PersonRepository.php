<?php

declare(strict_types=1);

namespace App\Modules\Party\Repositories;

use App\Modules\Party\Models\Person;
use App\Shared\Kernel\Domain\Repository;

final class PersonRepository extends Repository
{
    protected function modelClass(): string
    {
        return Person::class;
    }

    public function findByPartyId(string $partyId): ?Person
    {
        /** @var Person|null $p */
        $p = Person::query()->where('party_id', $partyId)->first();
        return $p;
    }
}
