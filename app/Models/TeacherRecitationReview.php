<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherRecitationReview extends Model
{
    public const PENDING = 'pending';

    public const REVIEWED = 'reviewed';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
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

    public function feedbackNote(): BelongsTo
    {
        return $this->belongsTo(TeacherNote::class, 'feedback_note_id');
    }

    public function privateNote(): BelongsTo
    {
        return $this->belongsTo(TeacherPrivateNote::class, 'private_note_id');
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'teacher_assignment_id');
    }
}
