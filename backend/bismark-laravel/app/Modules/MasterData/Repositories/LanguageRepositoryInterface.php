<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use App\Modules\MasterData\Models\Language;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface LanguageRepositoryInterface
{
    public function find(string $id): ?Language;

    public function findOrFail(string $id): Language;

    public function findByCode(string $code): ?Language;

    public function paginate(
        int $page = 1,
        int $perPage = 50,
        array $filters = [],
    ): LengthAwarePaginator;
}
