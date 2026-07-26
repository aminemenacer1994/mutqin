<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationPracticePlan extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_ABANDONED = 'abandoned';

    protected $fillable = [
        'user_id',
        'assessment_id',
        'session_recommendation_id',
        'title',
        'explanation',
        'band',
        'difficulty',
        'status',
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
            'priority_ayahs' => 'array',
            'weak_words' => 'array',
            'weak_phrases' => 'array',
            'techniques' => 'array',
            'repetitions' => 'array',
            'config' => 'array',
            'user_adjustments' => 'array',
            'completion_data' => 'array',
            'retest_metrics' => 'array',
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

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(SessionRecommendation::class, 'session_recommendation_id');
    }
}
