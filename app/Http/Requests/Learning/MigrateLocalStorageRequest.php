<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class MigrateLocalStorageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'state' => ['required', 'array'],
            'continue' => ['nullable', 'array'],
            'meta' => ['nullable', 'array'],
            'meta.device_id' => ['nullable', 'string', 'max:120'],
            'meta.device_label' => ['nullable', 'string', 'max:255'],
        ];
    }
}
