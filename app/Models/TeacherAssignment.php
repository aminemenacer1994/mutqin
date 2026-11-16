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
            'hifz_category' => 'string',
            'activity' => 'string',
            'recording_required' => 'boolean',
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
            'repetition_target' => 'integer',
            'due_at' => 'datetime',
            'priority' => 'string',
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

    public function learningPlan(): BelongsTo
    {
        return $this->belongsTo(LearningPlan::class);
    }

    public function learningPlanItem(): BelongsTo
    {
        return $this->belongsTo(LearningPlanItem::class);
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
