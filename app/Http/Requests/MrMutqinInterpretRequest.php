<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MrMutqinInterpretRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'transcript' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'array'],
            'context.role' => ['nullable', 'string', 'max:24'],
            'context.shell' => ['nullable', 'string', 'max:32'],
            'context.view' => ['nullable', 'string', 'max:48'],
            'context.pane' => ['nullable', 'string', 'max:48'],
            'context.student_id' => ['nullable', 'integer', 'min:1'],
            'context.surah' => ['nullable', 'integer', 'min:1', 'max:114'],
            'context.ayah_start' => ['nullable', 'integer', 'min:1', 'max:286'],
            'context.ayah_end' => ['nullable', 'integer', 'min:1', 'max:286'],
            'context.playback_active' => ['nullable', 'boolean'],
            'context.assessment_active' => ['nullable', 'boolean'],
            'context.preferences' => ['nullable', 'array'],
            'words' => ['nullable', 'array'],
        ];
    }
}