<?php

declare(strict_types=1);

namespace App\Modules\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:200'],
            'code'      => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9._-]+$/'],
            'branch_id' => ['nullable', 'uuid'],
            'parent_id' => ['nullable', 'uuid'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
