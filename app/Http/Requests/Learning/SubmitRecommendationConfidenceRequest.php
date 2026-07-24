<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SubmitRecommendationConfidenceRequest extends FormRequest
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
            'confidence' => ['required', 'string', 'in:confident,needs_practice'],
            'plan_detail' => ['sometimes', 'nullable', 'array'],
            'ayah_range' => ['sometimes', 'nullable', 'array'],
            'ayah_range.from' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'ayah_range.to' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'ayah_range.count' => ['sometimes', 'integer', 'min:1', 'max:3'],
            'focus_ayahs' => ['sometimes', 'array'],
            'focus_ayahs.*' => ['integer', 'min:1', 'max:300'],
        ];
    }
}
