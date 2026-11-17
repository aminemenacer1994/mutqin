<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentSelfAssessment extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignmentRecipient::class, 'teacher_assignment_recipient_id');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(TeacherLesson::class, 'teacher_lesson_id');
    }
}
