<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InterpretAskMutqinCommandRequest extends FormRequest
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
            'surah' => ['required', 'integer', 'min:1', 'max:114'],
            'ayah_start' => ['required', 'integer', 'min:1', 'max:286'],
            'current_speed' => ['nullable', 'numeric', 'min:0.25', 'max:3'],
            'current_reciter' => ['nullable', 'string', 'max:80'],
            'previous_command' => ['nullable', 'array'],
            'previous_command.intent' => ['nullable', 'string', 'max:32'],
            'previous_command.count' => ['nullable', 'integer', 'min:1', 'max:286'],
            'previous_command.until_ayah' => ['nullable', 'integer', 'min:1', 'max:286'],
            'previous_command.after_this' => ['nullable', 'boolean'],
            'previous_command.just_this' => ['nullable', 'boolean'],
            'previous_command.reciter' => ['nullable', 'string', 'max:80'],
            'previous_command.speed' => ['nullable', 'numeric', 'min:0.25', 'max:3'],
            'previous_command.repetitions' => ['nullable', 'integer', 'min:1', 'max:50'],
            'previous_command.autoplay' => ['nullable', 'boolean'],
        ];
    }
}
