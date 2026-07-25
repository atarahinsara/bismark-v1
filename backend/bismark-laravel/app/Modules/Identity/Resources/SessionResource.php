<?php

declare(strict_types=1);

namespace App\Modules\Identity\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'user_id'              => $this->user_id,
            'tenant_id'            => $this->tenant_id,
            'status'               => $this->whenNotNull($this->status?->value),
            'ip_address'           => $this->ip_address,
            'user_agent'           => $this->user_agent,
            'device_fingerprint'   => $this->device_fingerprint,
            'issued_at'            => $this->issued_at?->toIso8601String(),
            'last_activity_at'     => $this->last_activity_at?->toIso8601String(),
            'expires_at'           => $this->expires_at?->toIso8601String(),
            'absolute_expires_at'  => $this->absolute_expires_at?->toIso8601String(),
            'revoked_at'           => $this->revoked_at?->toIso8601String(),
            'revoked_reason'       => $this->revoked_reason,
        ];
    }
}
