<?php

declare(strict_types=1);

namespace App\Modules\Identity\Services;

use App\Modules\Identity\Contracts\DTOs\SessionDTO;
use App\Modules\Identity\Contracts\SessionCommandServiceInterface;
use App\Modules\Identity\Enums\SessionStatus;
use App\Modules\Identity\Events\SessionRevoked;
use App\Modules\Identity\Models\Session;
use App\Modules\Identity\Repositories\SessionRepositoryInterface;
use App\Shared\Kernel\Contracts\EventBusInterface;
use App\Shared\Kernel\Support\UuidV7Generator;
use Illuminate\Support\Facades\DB;

final class SessionCommandService implements SessionCommandServiceInterface
{
    public function __construct(
        private readonly SessionRepositoryInterface $sessions,
        private readonly EventBusInterface $bus,
    ) {
    }

    public function issue(SessionDTO $payload): SessionDTO
    {
        return DB::transaction(function () use ($payload): SessionDTO {
            $s = new Session();
            $s->id                  = UuidV7Generator::generateString();
            $s->user_id             = $payload->userId ?? throw new \InvalidArgumentException('userId required');
            $s->tenant_id           = $payload->tenantId ?? (string) app('bismark.tenant');
            $s->status              = SessionStatus::Active;
            $s->ip_address          = $payload->ipAddress ?? request()->ip() ?? '0.0.0.0';
            $s->user_agent          = $payload->userAgent ?? request()->userAgent();
            $s->device_fingerprint  = $payload->deviceFingerprint;
            $s->issued_at           = now();
            $s->last_activity_at    = now();
            $s->expires_at          = $payload->expiresAt
                ? \Carbon\CarbonImmutable::instance($payload->expiresAt)
                : now()->addMinutes((int) config('bismark.auth.session_ttl_minutes', 120));
            $s->absolute_expires_at = $payload->absoluteExpiresAt
                ? \Carbon\CarbonImmutable::instance($payload->absoluteExpiresAt)
                : now()->addMinutes((int) config('bismark.auth.absolute_ttl_minutes', 1440));
            $s->metadata            = $payload->metadata ?? [];

            $this->sessions->save($s);

            return $this->toDTO($s);
        });
    }

    public function touchActivity(string $id): SessionDTO
    {
        return DB::transaction(function () use ($id): SessionDTO {
            $s = $this->sessions->findOrFail($id);
            $s->last_activity_at = now();
            $this->sessions->save($s);
            return $this->toDTO($s);
        });
    }

    public function revoke(string $id, ?string $reason = null): SessionDTO
    {
        return DB::transaction(function () use ($id, $reason): SessionDTO {
            $s = $this->sessions->findOrFail($id);
            $s->status         = SessionStatus::Revoked;
            $s->revoked_at     = now();
            $s->revoked_reason = $reason;
            $this->sessions->save($s);

            $this->bus->flush([new SessionRevoked($s->id, $s->user_id, $s->tenant_id, $reason)]);

            return $this->toDTO($s);
        });
    }

    public function revokeAllForUser(string $userId, ?string $reason = null): int
    {
        return DB::transaction(function () use ($userId, $reason): int {
            $count = 0;
            foreach ($this->sessions->activeSessionsForUser($userId) as $session) {
                $session->status         = SessionStatus::Revoked;
                $session->revoked_at     = now();
                $session->revoked_reason = $reason;
                $this->sessions->save($session);
                $this->bus->dispatch(new SessionRevoked($session->id, $userId, $session->tenant_id, $reason));
                $count++;
            }
            return $count;
        });
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
