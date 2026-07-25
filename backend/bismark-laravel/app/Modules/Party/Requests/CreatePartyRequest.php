<?php

declare(strict_types=1);

namespace App\Modules\Party\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreatePartyRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'party_type'      => ['required', 'in:person,organization'],
            'display_name'    => ['required', 'string', 'max:300'],
            'status'          => ['nullable', 'in:active,inactive,suspended,blacklisted'],
            'tax_id'          => ['nullable', 'string', 'max:50'],
            'registration_no' => ['nullable', 'string', 'max:50'],
            'metadata'        => ['nullable', 'array'],
        ];
    }
}
