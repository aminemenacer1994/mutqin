<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SaveAnalyticsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'session_date' => ['nullable', 'date'],
            'sessions_completed' => ['nullable', 'integer', 'min:0'],
            'total_minutes' => ['nullable', 'integer', 'min:0'],
            'ayahs_memorised' => ['nullable', 'integer', 'min:0'],
            'ayahs_reviewed' => ['nullable', 'integer', 'min:0'],
            'streak_day' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
