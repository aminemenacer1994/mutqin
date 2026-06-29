<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SaveContinueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'last_step' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
            'last_opened_at' => ['nullable', 'date'],
        ];
    }
}
