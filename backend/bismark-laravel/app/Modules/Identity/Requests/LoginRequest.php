<?php

declare(strict_types=1);

namespace App\Modules\Identity\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username'          => ['required', 'string', 'max:50'],
            'password'          => ['required', 'string', 'max:200'],
            'device_fingerprint'=> ['nullable', 'string', 'max:255'],
        ];
    }
}
