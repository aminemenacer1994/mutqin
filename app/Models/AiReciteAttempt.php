<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiReciteAttempt extends Model
{
    public const SOURCE_DASHBOARD = 'dashboard_ai_recite';

    protected $table = 'ai_recite_attempts';

    protected $fillable = [
        'user_id',
        'session_recommendation_id',
        'user_session_id',
        'memorisation_assessment_id',
        'source',
        'attempt_number',
        'accuracy_percent',
        'band',
        'peek_used',
        'duration_ms',
        'ayah_range',
        'color_counts',
        'weak_words',
        'word_statuses',
        'plan_snapshot',
    ];

    protected $casts = [
        'attempt_number' => 'integer',
        'accuracy_percent' => 'integer',
        'peek_used' => 'boolean',
        'duration_ms' => 'integer',
        'ayah_range' => 'array',
        'color_counts' => 'array',
        'weak_words' => 'array',
        'word_statuses' => 'array',
        'plan_snapshot' => 'array',
    ];

    /**
     * Valid scored checks only — exclude provider/audio failures from accuracy denominators.
     */
    public function scopeValidScored($query)
    {
        return $query
            ->whereNotNull('accuracy_percent')
            ->whereIn('band', ['strong', 'mixed', 'weak']);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(SessionRecommendation::class, 'session_recommendation_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(UserSession::class, 'user_session_id');
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'memorisation_assessment_id');
    }
}
