<?php

namespace App\Http\Requests\Memorisation;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreFailedMemorisationAssessmentRequest extends FormRequest
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
            'model_version' => ['sometimes', 'nullable', 'string', 'max:64'],
            'algorithm_version' => ['sometimes', 'nullable', 'string', 'max:64'],
            'failure_reason' => ['sometimes', 'nullable', 'string', 'max:120'],
            'attempt_class' => ['sometimes', 'nullable', 'string', 'max:64'],
            'provider_status' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:599'],
            'started_at' => ['sometimes', 'nullable', 'date'],
            'device_metadata' => ['sometimes', 'nullable', 'array'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $v) => $this->validateOwnedAssessmentForeignKeys($v));
    }
}
