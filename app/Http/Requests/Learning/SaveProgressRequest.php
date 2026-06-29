<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SaveProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'max:2000'],
            'items.*.surah_number' => ['required', 'integer', 'min:1', 'max:114'],
            'items.*.ayah_number' => ['required', 'integer', 'min:1', 'max:300'],
            'items.*.status' => ['nullable', 'string', 'in:learning,reviewing,memorised,mastered'],
            'items.*.mastery_level' => ['nullable', 'integer', 'min:0', 'max:100'],
            'items.*.repetitions' => ['nullable', 'integer', 'min:0'],
            'items.*.completed_at' => ['nullable', 'date'],
            'items.*.metadata' => ['nullable', 'array'],
        ];
    }
}
