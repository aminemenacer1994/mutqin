<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SubmitRecommendationAiAssessmentRequest extends FormRequest
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
            'recommendation_id' => ['required', 'integer', 'min:1'],
            'result' => ['required', 'string', 'in:strong,mixed,weak'],
            'summary' => ['sometimes', 'nullable', 'string', 'max:500'],
            'weak_ayahs' => ['sometimes', 'array'],
            'weak_ayahs.*' => ['integer', 'min:1', 'max:300'],
        ];
    }
}
