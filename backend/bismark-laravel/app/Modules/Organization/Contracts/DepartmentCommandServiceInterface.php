<?php

declare(strict_types=1);

namespace App\Modules\Organization\Contracts;

use App\Modules\Organization\Contracts\DTOs\DepartmentDTO;

interface DepartmentCommandServiceInterface
{
    public function create(DepartmentDTO $payload): DepartmentDTO;

    public function update(string $id, DepartmentDTO $payload): DepartmentDTO;

    public function delete(string $id): void;
}
