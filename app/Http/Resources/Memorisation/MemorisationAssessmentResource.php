<?php

namespace App\Http\Resources\Memorisation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\MemorisationAssessment */
class MemorisationAssessmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_session_id' => $this->user_session_id,
            'surah_number' => $this->surah_number,
            'surah_name' => $this->surah_name,
            'start_ayah' => $this->start_ayah,
            'end_ayah' => $this->end_ayah,
            'assessment_type' => $this->assessment_type,
            'status' => $this->status,
            'completion_state' => $this->completion_state,
            'practice_mode' => $this->practice_mode,
            'mistake_handling_mode' => $this->mistake_handling_mode,
            'words_visible_percent' => $this->words_visible_percent,
            'accuracy' => $this->overall_accuracy,
            'match_result' => $this->match_result,
            'confidence' => $this->confidence,
            'duration_ms' => $this->duration_ms,
            'processing_duration_ms' => $this->processing_duration_ms,
            'failure_reason' => $this->failure_reason,
            'model_version' => $this->model_version,
            'algorithm_version' => $this->algorithm_version,
            'previous_assessment_id' => $this->previous_assessment_id,
            'started_at' => optional($this->started_at)?->toIso8601String(),
            'completed_at' => optional($this->completed_at)?->toIso8601String(),
            'created_at' => optional($this->created_at)?->toIso8601String(),
        ];
    }
}
