<?php

namespace App\Http\Requests\Learning;

use App\Rules\MaxJsonBytes;
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
            'state' => ['required', 'array', new MaxJsonBytes(MaxJsonBytes::STATE_BYTES)],
            'continue' => ['nullable', 'array', new MaxJsonBytes(MaxJsonBytes::HIFZ_BYTES)],
            'meta' => ['nullable', 'array'],
            'meta.device_id' => ['nullable', 'string', 'max:120'],
            'meta.device_label' => ['nullable', 'string', 'max:255'],
        ];
    }
}
