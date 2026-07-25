<?php

declare(strict_types=1);

namespace App\Modules\Party\Contracts;

use App\Modules\Party\Contracts\DTOs\PartyDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PartyQueryServiceInterface
{
    public function find(string $id): ?PartyDTO;

    public function findByBusinessCode(string $businessCode): ?PartyDTO;

    public function paginate(
        int $page = 1,
        int $perPage = 20,
        array $filters = [],
    ): LengthAwarePaginator;
}
