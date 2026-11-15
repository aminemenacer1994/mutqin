<?php

namespace App\Models;

use App\Enums\LearningPlanStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningPlan extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'status' => LearningPlanStatus::class,
            'starts_on' => 'date',
            'ends_on' => 'date',
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

    public function sourceTemplate(): BelongsTo
    {
        return $this->belongsTo(LearningPlanTemplate::class, 'source_template_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(LearningPlanItem::class)->orderBy('sort_order')->orderBy('id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TeacherAssignment::class, 'learning_plan_id');
    }
}
