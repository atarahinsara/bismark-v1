<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\SessionDTO;
use App\Modules\Identity\Contracts\SessionQueryServiceInterface;
use App\Modules\Identity\Models\Session;
use App\Modules\Identity\Repositories\SessionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class SessionQueryService implements SessionQueryServiceInterface
{
    public function __construct(
        private readonly SessionRepositoryInterface $sessions,
    ) {
    }

    public function find(string $id): ?SessionDTO
    {
        $s = $this->sessions->find($id);
        return $s ? $this->toDTO($s) : null;
    }

    public function paginateForUser(
        string $userId,
        int $page = 1,
        int $perPage = 20,
    ): LengthAwarePaginator {
        $tenantId = (string) app('bismark.tenant');
        return $this->sessions->paginateForTenant($tenantId, $page, $perPage, [
            'user_id' => $userId,
        ]);
    }

    private function toDTO(Session $s): SessionDTO
    {
        return new SessionDTO(
            id: $s->id,
            userId: $s->user_id,
            tenantId: $s->tenant_id,
            status: $s->status,
            ipAddress: $s->ip_address,
            userAgent: $s->user_agent,
            deviceFingerprint: $s->device_fingerprint,
            issuedAt: $s->issued_at?->toImmutable(),
            lastActivityAt: $s->last_activity_at?->toImmutable(),
            expiresAt: $s->expires_at?->toImmutable(),
            absoluteExpiresAt: $s->absolute_expires_at?->toImmutable(),
            revokedAt: $s->revoked_at?->toImmutable(),
            revokedReason: $s->revoked_reason,
            metadata: $s->metadata,
        );
    }
}
