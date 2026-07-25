<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\UserDTO;

/**
 * UserCommandService — write-side contract for the User aggregate.
 *
 * All write operations:
 *   - run inside DB::transaction
 *   - emit domain events via EventBusInterface (Outbox pattern)
 *   - enforce tenant scoping (no cross-tenant writes)
 */
interface UserCommandServiceInterface
{
    public function create(UserDTO $payload): UserDTO;

    public function update(string $id, UserDTO $payload): UserDTO;

    public function delete(string $id): void;

    public function suspend(string $id, ?string $reason = null): UserDTO;

    public function unsuspend(string $id): UserDTO;

    public function lock(string $id, \DateTimeImmutable $until): UserDTO;

    public function unlock(string $id): UserDTO;
}
