<?php

declare(strict_types=1);

namespace App\Modules\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'      => ['sometimes', 'string', 'max:200'],
            'branch_id' => ['sometimes', 'nullable', 'uuid'],
            'parent_id' => ['sometimes', 'nullable', 'uuid'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
