<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationAttemptComparison extends Model
{
    protected $fillable = [
        'user_id',
        'previous_assessment_id',
        'follow_up_assessment_id',
        'practice_plan_id',
        'accuracy_delta',
        'improved_count',
        'unchanged_count',
        'new_weak_count',
        'improved_items',
        'unchanged_items',
        'new_weak_items',
        'summary_key',
        'summary',
        'metrics',
    ];

    protected function casts(): array
    {
        return [
            'accuracy_delta' => 'integer',
            'improved_count' => 'integer',
            'unchanged_count' => 'integer',
            'new_weak_count' => 'integer',
            'improved_items' => 'array',
            'unchanged_items' => 'array',
            'new_weak_items' => 'array',
            'metrics' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function previousAssessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'previous_assessment_id');
    }

    public function followUpAssessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'follow_up_assessment_id');
    }

    public function practicePlan(): BelongsTo
    {
        return $this->belongsTo(MemorisationPracticePlan::class, 'practice_plan_id');
    }
}
