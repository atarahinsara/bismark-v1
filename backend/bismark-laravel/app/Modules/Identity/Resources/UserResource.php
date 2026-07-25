<?php

declare(strict_types=1);

namespace App\Modules\Identity\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'tenant_id'     => $this->tenant_id,
            'username'      => $this->username,
            'display_name'  => $this->display_name,
            'email'         => $this->email,
            'phone'         => $this->phone,
            'user_type'     => $this->whenNotNull($this->user_type?->value),
            'status'        => $this->whenNotNull($this->status?->value),
            'locale'        => $this->locale,
            'is_active'     => (bool) $this->is_active,
            'locked_until'  => $this->locked_until?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'metadata'      => $this->metadata,
            'created_at'    => $this->created_at?->toIso8601String(),
            'updated_at'    => $this->updated_at?->toIso8601String(),
        ];
    }
}
