<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherRecitationFeedbackSegment extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'start_ms' => 'integer',
            'end_ms' => 'integer',
            'audio_bytes' => 'integer',
            'audio_duration_ms' => 'integer',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'ai_recite_attempt_id');
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(TeacherRecitationReview::class, 'teacher_recitation_review_id');
    }
}