<?php

namespace App\Models;

use App\Enums\RecommendationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionRecommendation extends Model
{
    protected $fillable = [
        'user_id',
        'source_session_id',
        'surah_number',
        'ayah_start',
        'ayah_end',
        'recommendation_type',
        'reason_code',
        'session_mode',
        'status',
        'range_kind',
        'recommended_technique',
        'recommended_reciter',
        'recommended_playback_speed',
        'recommended_repetitions',
        'recommended_ayat_per_step',
        'recommended_settings',
        'settings_overrides',
        'confidence_feedback',
        'ai_assessment',
        'supersedes_recommendation_id',
        'idempotency_key',
        'accepted',
        'chose_other',
        'started_session_id',
        'payload',
        'accepted_at',
        'rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
            'accepted' => 'boolean',
            'chose_other' => 'boolean',
            'started_session_id' => 'integer',
            'payload' => 'array',
            'recommended_settings' => 'array',
            'settings_overrides' => 'array',
            'ai_assessment' => 'array',
            'recommended_playback_speed' => 'float',
            'recommended_repetitions' => 'integer',
            'recommended_ayat_per_step' => 'integer',
            'status' => RecommendationStatus::class,
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceSession(): BelongsTo
    {
        return $this->belongsTo(UserSession::class, 'source_session_id');
    }

    public function startedSession(): BelongsTo
    {
        return $this->belongsTo(UserSession::class, 'started_session_id');
    }

    public function supersedes(): BelongsTo
    {
        return $this->belongsTo(self::class, 'supersedes_recommendation_id');
    }
}
