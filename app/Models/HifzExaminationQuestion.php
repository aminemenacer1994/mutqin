<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HifzExaminationQuestion extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'end_surah_number' => 'integer',
            'end_ayah_number' => 'integer',
            'recitation_length_ayahs' => 'integer',
            'meta' => 'array',
            'hesitation' => 'boolean',
            'prompts_used' => 'integer',
            'completed' => 'boolean',
            'teacher_score' => 'integer',
            'answered_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(HifzExaminationAttempt::class, 'hifz_examination_attempt_id');
    }

    public function memorisationAssessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class);
    }

    public function aiReciteAttempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class);
    }
}