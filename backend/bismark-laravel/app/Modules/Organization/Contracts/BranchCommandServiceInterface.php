<?php

declare(strict_types=1);

namespace App\Modules\Organization\Contracts;

use App\Modules\Organization\Contracts\DTOs\BranchDTO;

interface BranchCommandServiceInterface
{
    public function create(BranchDTO $payload): BranchDTO;

    public function update(string $id, BranchDTO $payload): BranchDTO;

    public function delete(string $id): void;
}
