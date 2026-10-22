<?php

namespace App\Models;

use App\Enums\AssignmentStatus;
use Database\Factories\TeacherAssignmentRecipientFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeacherAssignmentRecipient extends Model
{
    /** @use HasFactory<TeacherAssignmentRecipientFactory> */
    use HasFactory;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'status' => AssignmentStatus::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'student_completed_at' => 'datetime',
            'completion_evidence' => 'array',
        ];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'teacher_assignment_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class, 'teacher_assignment_recipient_id');
    }

    public function aiReciteAttempts(): HasMany
    {
        return $this->hasMany(AiReciteAttempt::class, 'teacher_assignment_recipient_id');
    }
}
