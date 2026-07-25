<?php

declare(strict_types=1);

namespace App\Modules\Party\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PartyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'tenant_id'        => $this->tenant_id,
            'business_code'    => $this->business_code,
            'party_type'       => $this->whenNotNull($this->party_type?->value),
            'display_name'     => $this->display_name,
            'status'           => $this->whenNotNull($this->status?->value),
            'tax_id'           => $this->tax_id,
            'registration_no'  => $this->registration_no,
            'metadata'         => $this->metadata,
            'created_at'       => $this->created_at?->toIso8601String(),
            'updated_at'       => $this->updated_at?->toIso8601String(),
        ];
    }
}
