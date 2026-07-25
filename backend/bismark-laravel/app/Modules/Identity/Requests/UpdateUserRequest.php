<?php

declare(strict_types=1);

namespace App\Modules\Identity\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'string', 'max:200'],
            'email'        => ['sometimes', 'nullable', 'email:rfc', 'max:255'],
            'phone'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'user_type'    => ['sometimes', 'in:customer,representative,technician,service_center,staff'],
            'locale'       => ['sometimes', 'string', 'max:10'],
            'is_active'    => ['sometimes', 'boolean'],
            'metadata'     => ['sometimes', 'array'],
        ];
    }
}
