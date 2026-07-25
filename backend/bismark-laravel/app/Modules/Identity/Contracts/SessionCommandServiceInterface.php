<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Contracts\DTOs\SessionDTO;

interface SessionCommandServiceInterface
{
    public function issue(SessionDTO $payload): SessionDTO;

    public function touchActivity(string $id): SessionDTO;

    public function revoke(string $id, ?string $reason = null): SessionDTO;

    public function revokeAllForUser(string $userId, ?string $reason = null): int;
}
