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
            'sequence_errors' => ['sometimes', 'integer', 'min:0', 'max:500'],
            'missed_words' => ['sometimes', 'integer', 'min:0', 'max:2000'],
            'pronunciation_issues' => ['sometimes', 'boolean'],
            'color_counts' => ['sometimes', 'nullable', 'array'],
            'color_counts.green' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'color_counts.amber' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'color_counts.red' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'color_counts.black' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'color_counts.gray' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'plan_detail' => ['sometimes', 'nullable', 'array'],
            'settings' => ['sometimes', 'nullable', 'array'],
            'ayah_range' => ['sometimes', 'nullable', 'array'],
            'ayah_range.from' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'ayah_range.to' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'ayah_range.count' => ['sometimes', 'integer', 'min:1', 'max:3'],
            'focus_ayahs' => ['sometimes', 'array'],
            'focus_ayahs.*' => ['integer', 'min:1', 'max:300'],
            'average_accuracy' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'accuracy_percent' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'attempt_count' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10'],
            'weak_words' => ['sometimes', 'array', 'max:40'],
            'weak_words.*.surahId' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:114'],
            'weak_words.*.ayahNumber' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:300'],
            'weak_words.*.wordIndex' => ['sometimes', 'integer', 'min:0', 'max:200'],
            'weak_words.*.text' => ['sometimes', 'nullable', 'string', 'max:120'],
            'weak_words.*.reason' => ['sometimes', 'nullable', 'string', 'max:40'],
            'weak_words.*.verseKey' => ['sometimes', 'nullable', 'string', 'max:32'],
            'weak_words.*.severity' => ['sometimes', 'nullable', 'string', 'max:16'],
            'attempts' => ['sometimes', 'array', 'max:10'],
            'attempts.*.attempt_number' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'attempts.*.accuracy' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'attempts.*.accuracyPercent' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'attempts.*.band' => ['sometimes', 'nullable', 'string', 'max:16'],
            'attempts.*.ayah_range' => ['sometimes', 'nullable', 'array'],
            'attempts.*.color_counts' => ['sometimes', 'nullable', 'array'],
            'attempts.*.weak_words' => ['sometimes', 'array', 'max:40'],
            'attempts.*.word_statuses' => ['sometimes', 'array', 'max:200'],
            'attempts.*.plan_snapshot' => ['sometimes', 'nullable', 'array'],
            'attempts.*.result' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
