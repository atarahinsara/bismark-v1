<?php

declare(strict_types=1);

namespace App\Modules\Identity\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'key'         => $this->key,
            'module'      => $this->module,
            'action'      => $this->action,
            'description' => $this->description,
            'is_system'   => (bool) $this->is_system,
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
