<?php

declare(strict_types=1);

namespace App\Modules\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateBranchRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'          => ['sometimes', 'string', 'max:200'],
            'parent_id'     => ['sometimes', 'nullable', 'uuid'],
            'address'       => ['sometimes', 'array'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active'     => ['sometimes', 'boolean'],
        ];
    }
}
