<?php

declare(strict_types=1);

namespace App\Modules\Party\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePartyRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'display_name'    => ['sometimes', 'string', 'max:300'],
            'status'          => ['sometimes', 'in:active,inactive,suspended,blacklisted'],
            'tax_id'          => ['sometimes', 'nullable', 'string', 'max:50'],
            'registration_no' => ['sometimes', 'nullable', 'string', 'max:50'],
            'metadata'        => ['sometimes', 'array'],
        ];
    }
}
