<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

use App\Modules\Identity\Models\Tenant;
use App\Shared\Kernel\Domain\Repository;

final class TenantRepository extends Repository
{
    protected function modelClass(): string
    {
        return Tenant::class;
    }

    public function findByKey(string $key): ?Tenant
    {
        /** @var Tenant|null $t */
        $t = Tenant::query()->where('key', $key)->first();
        return $t;
    }
}
