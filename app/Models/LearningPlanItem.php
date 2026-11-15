<?php

namespace App\Models;

use App\Enums\LearningPlanItemStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningPlanItem extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'item_status' => LearningPlanItemStatus::class,
            'due_on' => 'date',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(LearningPlan::class, 'learning_plan_id');
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'teacher_assignment_id');
    }

    public function weakSpot(): BelongsTo
    {
        return $this->belongsTo(MemorisationWeakSpot::class, 'weak_spot_id');
    }
}
