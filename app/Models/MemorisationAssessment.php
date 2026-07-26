<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MemorisationAssessment extends Model
{
    protected $fillable = [
        'user_id',
        'user_session_id',
        'session_recommendation_id',
        'previous_assessment_id',
        'surah_number',
        'start_ayah',
        'end_ayah',
        'assessment_type',
        'surah_name',
        'recognition_data',
        'word_results',
        'ayah_results',
        'error_classifications',
        'weakness_analysis',
        'overall_accuracy',
        'confidence',
        'duration_ms',
        'friendly_summary',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'start_ayah' => 'integer',
            'end_ayah' => 'integer',
            'overall_accuracy' => 'integer',
            'confidence' => 'float',
            'duration_ms' => 'integer',
            'recognition_data' => 'array',
            'word_results' => 'array',
            'ayah_results' => 'array',
            'error_classifications' => 'array',
            'weakness_analysis' => 'array',
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
}
