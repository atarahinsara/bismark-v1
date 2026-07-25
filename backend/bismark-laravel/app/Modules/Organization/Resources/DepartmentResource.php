<?php

declare(strict_types=1);

namespace App\Modules\Organization\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'tenant_id'  => $this->tenant_id,
            'name'       => $this->name,
            'code'       => $this->code,
            'branch_id'  => $this->branch_id,
            'parent_id'  => $this->parent_id,
            'is_active'  => (bool) $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
