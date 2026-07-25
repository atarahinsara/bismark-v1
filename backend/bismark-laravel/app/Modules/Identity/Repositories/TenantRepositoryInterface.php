<?php

declare(strict_types=1);

namespace App\Modules\Identity\Repositories;

interface TenantRepositoryInterface
{
    public function find(string $id): ?object;

    public function findOrFail(string $id): object;

    public function findByKey(string $key): ?object;

    public function save(object $model): bool;

    public function delete(object $model): bool;
}
