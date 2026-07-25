<?php

declare(strict_types=1);

namespace App\Modules\Organization\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class BranchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'tenant_id'     => $this->tenant_id,
            'name'          => $this->name,
            'code'          => $this->code,
            'parent_id'     => $this->parent_id,
            'address'       => $this->address,
            'contact_phone' => $this->contact_phone,
            'is_active'     => (bool) $this->is_active,
            'created_at'    => $this->created_at?->toIso8601String(),
            'updated_at'    => $this->updated_at?->toIso8601String(),
        ];
    }
}
