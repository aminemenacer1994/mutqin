<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MemorisationPracticePlan extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_ABANDONED = 'abandoned';

    public const STATUS_DISMISSED = 'dismissed';

    public const SCOPE_WEAK_AREAS = 'weak_areas';

    public const SCOPE_FULL_RANGE = 'full_range';

    protected $fillable = [
        'user_id',
        'assessment_id',
        'session_recommendation_id',
        'follow_up_assessment_id',
        'title',
        'explanation',
        'band',
        'difficulty',
        'status',
        'practice_scope',
        'recommended_technique',
        'recommended_repetitions',
        'recommended_playback_speed',
        'recommended_review_at',
        'accepted_at',
        'dismissed_at',
        'completion_outcome',
        'surah_number',
        'start_ayah',
        'end_ayah',
        'priority_ayahs',
        'weak_words',
        'weak_phrases',
        'techniques',
        'repetitions',
        'config',
        'user_adjustments',
        'completion_data',
        'retest_metrics',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'start_ayah' => 'integer',
            'end_ayah' => 'integer',
            'recommended_repetitions' => 'integer',
            'recommended_playback_speed' => 'float',
            'priority_ayahs' => 'array',
            'weak_words' => 'array',
            'weak_phrases' => 'array',
            'techniques' => 'array',
            'repetitions' => 'array',
            'config' => 'array',
            'user_adjustments' => 'array',
            'completion_data' => 'array',
            'retest_metrics' => 'array',
            'recommended_review_at' => 'datetime',
            'accepted_at' => 'datetime',
            'dismissed_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'assessment_id');
    }

    public function followUpAssessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'follow_up_assessment_id');
    }

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(SessionRecommendation::class, 'session_recommendation_id');
    }

    public function comparisons(): HasMany
    {
        return $this->hasMany(MemorisationAttemptComparison::class, 'practice_plan_id');
    }
}
