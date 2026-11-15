<?php

namespace App\Models;

use App\Enums\TeacherPrivateNoteCategory;
use Database\Factories\TeacherPrivateNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeacherPrivateNote extends Model
{
    /** @use HasFactory<TeacherPrivateNoteFactory> */
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'category' => TeacherPrivateNoteCategory::class,
            'pinned' => 'boolean',
            'archived_at' => 'datetime',
            'shared_at' => 'datetime',
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

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'teacher_assignment_id');
    }

    public function sharedFeedback(): BelongsTo
    {
        return $this->belongsTo(TeacherNote::class, 'shared_feedback_note_id');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function isShared(): bool
    {
        return $this->shared_at !== null && $this->shared_feedback_note_id !== null;
    }
}
