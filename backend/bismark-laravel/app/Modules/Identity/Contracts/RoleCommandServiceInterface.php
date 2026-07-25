<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\RoleDTO;

interface RoleCommandServiceInterface
{
    public function create(RoleDTO $payload): RoleDTO;

    public function update(string $id, RoleDTO $payload): RoleDTO;

    public function delete(string $id): void;
}
