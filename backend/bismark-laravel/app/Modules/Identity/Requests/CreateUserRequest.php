<?php

declare(strict_types=1);

namespace App\Modules\Identity\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username'     => ['required', 'string', 'max:50', 'regex:/^[a-z0-9._-]+$/'],
            'display_name' => ['required', 'string', 'max:200'],
            'email'        => ['nullable', 'email:rfc', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:20'],
            'user_type'    => ['nullable', 'in:customer,representative,technician,service_center,staff'],
            'locale'       => ['nullable', 'string', 'max:10'],
            'is_active'    => ['nullable', 'boolean'],
            'metadata'     => ['nullable', 'array'],
        ];
    }
}
