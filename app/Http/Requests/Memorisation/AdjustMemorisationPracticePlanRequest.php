<?php

namespace App\Http\Requests\Memorisation;

use Illuminate\Foundation\Http\FormRequest;

class AdjustMemorisationPracticePlanRequest extends FormRequest
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
            'start_ayah' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'end_ayah' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'repetitions' => ['sometimes', 'integer', 'min:1', 'max:8'],
            'audio_enabled' => ['sometimes', 'boolean'],
            'visual_assistance' => ['sometimes', 'string', 'in:low,medium,high'],
            'difficulty' => ['sometimes', 'string', 'in:light,focused,gentle'],
            'playback_speed' => ['sometimes', 'numeric', 'min:0.5', 'max:1.5'],
            'techniques' => ['sometimes', 'array', 'max:4'],
            'techniques.*' => ['string', 'in:anchor,talqin,chunking,blur,chaining,focus'],
            'priority_ayahs' => ['sometimes', 'array', 'max:20'],
            'priority_ayahs.*' => ['integer', 'min:1', 'max:300'],
        ];
    }
}
