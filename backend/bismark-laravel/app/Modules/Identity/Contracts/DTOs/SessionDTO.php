<?php

declare(strict_types=1);

namespace App\Modules\Identity\Contracts\DTOs;

use App\Modules\Identity\Enums\SessionStatus;

final class SessionDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly ?string $userId,
        public readonly ?string $tenantId,
        public readonly ?SessionStatus $status,
        public readonly ?string $ipAddress,
        public readonly ?string $userAgent,
        public readonly ?string $deviceFingerprint,
        public readonly ?\DateTimeImmutable $issuedAt,
        public readonly ?\DateTimeImmutable $lastActivityAt,
        public readonly ?\DateTimeImmutable $expiresAt,
        public readonly ?\DateTimeImmutable $absoluteExpiresAt,
        public readonly ?\DateTimeImmutable $revokedAt,
        public readonly ?string $revokedReason,
        /** @var array<string, mixed>|null */
        public readonly ?array $metadata,
    ) {
    }
}
