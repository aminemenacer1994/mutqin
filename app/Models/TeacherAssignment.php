<?php

namespace App\Models;

use App\Enums\AssignmentKind;
use Database\Factories\TeacherAssignmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeacherAssignment extends Model
{
    /** @use HasFactory<TeacherAssignmentFactory> */
    use HasFactory;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'kind' => AssignmentKind::class,
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
            'repetition_target' => 'integer',
            'due_at' => 'datetime',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function learningGroup(): BelongsTo
    {
        return $this->belongsTo(LearningGroup::class);
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(TeacherAssignmentRecipient::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(TeacherNote::class, 'teacher_assignment_id');
    }
}
