<?php

namespace App\Http\Resources\Memorisation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\MemorisationAttemptComparison */
class MemorisationAttemptComparisonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'previous_assessment_id' => $this->previous_assessment_id,
            'follow_up_assessment_id' => $this->follow_up_assessment_id,
            'practice_plan_id' => $this->practice_plan_id,
            'accuracy_delta' => $this->accuracy_delta,
            'improved_count' => $this->improved_count,
            'unchanged_count' => $this->unchanged_count,
            'new_weak_count' => $this->new_weak_count,
            'improved_items' => $this->improved_items ?? [],
            'unchanged_items' => $this->unchanged_items ?? [],
            'new_weak_items' => $this->new_weak_items ?? [],
            'summary_key' => $this->summary_key,
            'summary' => $this->summary,
            'metrics' => $this->metrics,
            'created_at' => optional($this->created_at)?->toIso8601String(),
        ];
    }
}
