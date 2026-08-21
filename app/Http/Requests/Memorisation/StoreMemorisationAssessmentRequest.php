<?php

namespace App\Http\Requests\Memorisation;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreMemorisationAssessmentRequest extends FormRequest
{
    use ValidatesOwnedAssessmentForeignKeys;

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
            'recognition_words.*.start' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'recognition_words.*.end' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'tajweed_practice_check' => ['sometimes', 'nullable', 'array'],
            'tajweed_practice_check.version' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10'],
            'tajweed_practice_check.assessed' => ['sometimes', 'nullable', 'boolean'],
            'tajweed_practice_check.band' => ['sometimes', 'nullable', 'string', 'max:32'],
            'tajweed_practice_check.headline' => ['sometimes', 'nullable', 'string', 'max:280'],
            'tajweed_practice_check.summary' => ['sometimes', 'nullable', 'string', 'max:500'],
            'tajweed_practice_check.disclaimer' => ['sometimes', 'nullable', 'string', 'max:280'],
            'tajweed_practice_check.reciterName' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tajweed_practice_check.colourTips' => ['sometimes', 'nullable', 'array', 'max:8'],
            'tajweed_practice_check.segmentTips' => ['sometimes', 'nullable', 'array', 'max:8'],
            'tajweed_practice_check.crossRefs' => ['sometimes', 'nullable', 'array', 'max:8'],
            'tajweed_practice_check.segments' => ['sometimes', 'nullable', 'array', 'max:120'],
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
            'processing_duration_ms' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:3600000'],
            'provider' => ['sometimes', 'nullable', 'string', 'max:40'],
            'user_session_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'session_recommendation_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'previous_assessment_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'idempotency_key' => ['sometimes', 'nullable', 'string', 'max:64'],
            'practice_mode' => ['sometimes', 'nullable', 'string', 'max:32'],
            'mistake_handling_mode' => ['sometimes', 'nullable', 'string', 'max:40'],
            'words_visible_percent' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'completion_state' => ['sometimes', 'nullable', 'string', 'max:32'],
            'practice_scope' => ['sometimes', 'nullable', 'string', 'in:weak_areas,full_range'],
            'match_result' => ['sometimes', 'nullable', 'string', 'max:32'],
            'model_version' => ['sometimes', 'nullable', 'string', 'max:64'],
            'algorithm_version' => ['sometimes', 'nullable', 'string', 'max:64'],
            'started_at' => ['sometimes', 'nullable', 'date'],
            'device_metadata' => ['sometimes', 'nullable', 'array'],
            'device_metadata.browser' => ['sometimes', 'nullable', 'string', 'max:120'],
            'device_metadata.platform' => ['sometimes', 'nullable', 'string', 'max:120'],
            'device_metadata.os' => ['sometimes', 'nullable', 'string', 'max:120'],
            'device_metadata.device_type' => ['sometimes', 'nullable', 'string', 'max:40'],
            'device_metadata.timezone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'device_metadata.locale' => ['sometimes', 'nullable', 'string', 'max:32'],
            'device_metadata.user_agent_hash' => ['sometimes', 'nullable', 'string', 'max:64'],
            'device_metadata.viewport' => ['sometimes', 'nullable', 'array'],
            'device_metadata.viewport.width' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'device_metadata.viewport.height' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $v) => $this->validateOwnedAssessmentForeignKeys($v));
    }
}
