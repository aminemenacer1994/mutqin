<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SaveSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'action' => ['nullable', 'string', 'in:save,start,pause,resume,end,discard_example'],
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'current_step' => ['nullable', 'integer', 'min:0'],
            'memorisation_mode' => ['nullable', 'string', 'max:32'],
            'status' => ['nullable', 'string', 'in:none,active,paused,interrupted,completed,abandoned'],
            'is_onboarding_example' => ['nullable', 'boolean'],
            'repetitions_completed' => ['nullable', 'integer', 'min:0'],
            'session_duration_seconds' => ['nullable', 'integer', 'min:0'],
            'last_activity_at' => ['nullable', 'date'],
            'started_at' => ['nullable', 'date'],
            'paused_at' => ['nullable', 'date'],
            'resumed_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ];
    }
}
