<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SubmitRecommendationAdaptiveAssessmentRequest extends FormRequest
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
            'assessment_id' => ['sometimes', 'nullable', 'string', 'max:120'],
            'weak_ayahs' => ['sometimes', 'array'],
            'weak_ayahs.*' => ['integer', 'min:1', 'max:300'],
            'sequence_errors' => ['sometimes', 'integer', 'min:0', 'max:500'],
            'missed_words' => ['sometimes', 'integer', 'min:0', 'max:2000'],
            'pronunciation_issues' => ['sometimes', 'boolean'],
            'reason_codes' => ['sometimes', 'array'],
            'reason_codes.*' => ['string', 'max:64'],
            'skills' => ['sometimes', 'array'],
            'skill_view' => ['sometimes', 'array'],
            'policy' => ['sometimes', 'array'],
            'responses' => ['sometimes', 'array'],
            'events' => ['sometimes', 'array'],
            'review' => ['sometimes', 'array'],
            'snapshot' => ['sometimes', 'array'],
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
