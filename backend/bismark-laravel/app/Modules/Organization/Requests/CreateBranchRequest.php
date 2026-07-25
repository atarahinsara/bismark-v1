<?php

declare(strict_types=1);

namespace App\Modules\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateBranchRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:200'],
            'code'          => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9._-]+$/'],
            'parent_id'     => ['nullable', 'uuid'],
            'address'       => ['nullable', 'array'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'is_active'     => ['nullable', 'boolean'],
        ];
    }
}
