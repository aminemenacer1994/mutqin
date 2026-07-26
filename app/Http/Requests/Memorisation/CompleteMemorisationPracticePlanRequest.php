<?php

namespace App\Http\Requests\Memorisation;

use Illuminate\Foundation\Http\FormRequest;

class CompleteMemorisationPracticePlanRequest extends FormRequest
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
            'repetitions_completed' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'chunks_completed' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'strengthened_words' => ['sometimes', 'integer', 'min:0', 'max:200'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
