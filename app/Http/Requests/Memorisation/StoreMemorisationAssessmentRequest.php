<?php

namespace App\Http\Requests\Memorisation;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemorisationAssessmentRequest extends FormRequest
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
            'surah_number' => ['required', 'integer', 'min:1', 'max:114'],
            'surah_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'start_ayah' => ['required', 'integer', 'min:1', 'max:300'],
            'end_ayah' => ['required', 'integer', 'min:1', 'max:300', 'gte:start_ayah'],
            'assessment_type' => ['sometimes', 'nullable', 'string', 'max:32'],
            'transcript' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'recognition_words' => ['sometimes', 'array', 'max:2000'],
            'recognition_words.*.word' => ['sometimes', 'nullable', 'string', 'max:120'],
            'recognition_words.*.text' => ['sometimes', 'nullable', 'string', 'max:120'],
            'recognition_words.*.confidence' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1'],
            'ayahs' => ['required', 'array', 'min:1', 'max:50'],
            'ayahs.*.ayah_number' => ['required_without:ayahs.*.ayahNumber', 'integer', 'min:1', 'max:300'],
            'ayahs.*.ayahNumber' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'ayahs.*.text' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'ayahs.*.arabic' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'ayahs.*.words' => ['sometimes', 'array', 'max:200'],
            'ayahs.*.words.*' => ['string', 'max:120'],
            'ayahs.*.surah_number' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:114'],
            'ayahs.*.key' => ['sometimes', 'nullable', 'string', 'max:32'],
            'target_text' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'duration_ms' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:3600000'],
            'provider' => ['sometimes', 'nullable', 'string', 'max:40'],
            'user_session_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'session_recommendation_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'previous_assessment_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
