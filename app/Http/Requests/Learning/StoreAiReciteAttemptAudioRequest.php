<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class StoreAiReciteAttemptAudioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'audio' => ['required', 'file', 'max:8192'],
            'duration_ms' => ['nullable', 'integer', 'min:1', 'max:600000'],
        ];
    }
}
