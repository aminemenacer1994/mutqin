<?php

namespace App\Http\Resources\Memorisation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\MemorisationWeakSpot */
class MemorisationWeakSpotResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'spot_type' => $this->spot_type,
            'surah_number' => $this->surah_number,
            'ayah_number' => $this->ayah_number,
            'word_index' => $this->word_index,
            'verse_key' => $this->verse_key,
            'severity' => $this->severity,
            'status' => $this->status,
            'trend' => $this->trend,
            'affected_attempt_count' => $this->affected_attempt_count,
            'first_identified_at' => optional($this->first_identified_at)?->toIso8601String(),
            'last_identified_at' => optional($this->last_identified_at)?->toIso8601String(),
            'last_recalled_at' => optional($this->last_recalled_at)?->toIso8601String(),
            'source_assessment_id' => $this->source_assessment_id,
            'last_assessment_id' => $this->last_assessment_id,
        ];
    }
}
