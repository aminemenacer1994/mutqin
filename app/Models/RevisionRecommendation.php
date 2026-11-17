<?php

namespace App\Models;

use App\Enums\RevisionRecommendationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevisionRecommendation extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'status' => RevisionRecommendationStatus::class,
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
            'due_on' => 'date',
            'evidence' => 'array',
            'accepted_at' => 'datetime',
            'dismissed_at' => 'datetime',
            'assigned_at' => 'datetime',
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

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'teacher_assignment_id');
    }

    public function planItem(): BelongsTo
    {
        return $this->belongsTo(LearningPlanItem::class, 'learning_plan_item_id');
    }
}
