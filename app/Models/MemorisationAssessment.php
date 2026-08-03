<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class MemorisationAssessment extends Model
{
    use SoftDeletes;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'user_session_id',
        'session_recommendation_id',
        'previous_assessment_id',
        'idempotency_key',
        'surah_number',
        'start_ayah',
        'end_ayah',
        'assessment_type',
        'status',
        'completion_state',
        'practice_mode',
        'mistake_handling_mode',
        'words_visible_percent',
        'surah_name',
        'recognition_data',
        'word_results',
        'ayah_results',
        'error_classifications',
        'weakness_analysis',
        'overall_accuracy',
        'match_result',
        'confidence',
        'duration_ms',
        'processing_duration_ms',
        'failure_reason',
        'friendly_summary',
        'model_version',
        'algorithm_version',
        'started_at',
        'completed_at',
        'device_metadata',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'start_ayah' => 'integer',
            'end_ayah' => 'integer',
            'words_visible_percent' => 'integer',
            'overall_accuracy' => 'integer',
            'confidence' => 'float',
            'duration_ms' => 'integer',
            'processing_duration_ms' => 'integer',
            'recognition_data' => 'array',
            'word_results' => 'array',
            'ayah_results' => 'array',
            'error_classifications' => 'array',
            'weakness_analysis' => 'array',
            'device_metadata' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(UserSession::class, 'user_session_id');
    }

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(SessionRecommendation::class, 'session_recommendation_id');
    }

    public function previousAssessment(): BelongsTo
    {
        return $this->belongsTo(self::class, 'previous_assessment_id');
    }

    public function practicePlan(): HasOne
    {
        return $this->hasOne(MemorisationPracticePlan::class, 'assessment_id');
    }

    public function wordResults(): HasMany
    {
        return $this->hasMany(MemorisationAssessmentWord::class, 'assessment_id');
    }

    public function followUpComparisons(): HasMany
    {
        return $this->hasMany(MemorisationAttemptComparison::class, 'previous_assessment_id');
    }

    public function asFollowUpComparisons(): HasMany
    {
        return $this->hasMany(MemorisationAttemptComparison::class, 'follow_up_assessment_id');
    }
}
