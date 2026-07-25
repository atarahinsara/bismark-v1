<?php

declare(strict_types=1);

namespace App\Modules\Identity\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key'         => ['required', 'string', 'max:50', 'regex:/^[a-z0-9._-]+$/'],
            'name'        => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_system'   => ['nullable', 'boolean'],
        ];
    }
}
