<?php

declare(strict_types=1);

namespace App\Modules\Party\Contracts;

use App\Modules\Party\Contracts\DTOs\PartyDTO;

interface PartyCommandServiceInterface
{
    public function create(PartyDTO $payload): PartyDTO;

    public function update(string $id, PartyDTO $payload): PartyDTO;

    public function delete(string $id): void;
}
