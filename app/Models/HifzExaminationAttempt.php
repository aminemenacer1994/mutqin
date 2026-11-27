<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HifzExaminationAttempt extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'question_count' => 'integer',
            'completed_question_count' => 'integer',
            'settings_snapshot' => 'array',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignmentRecipient::class, 'teacher_assignment_recipient_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(HifzExaminationQuestion::class)->orderBy('position');
    }
}