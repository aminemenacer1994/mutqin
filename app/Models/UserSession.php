<?php

namespace App\Models;

use App\Enums\UserSessionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSession extends Model
{
    protected $fillable = [
        'user_id',
        'surah_number',
        'ayah_number',
        'current_step',
        'memorisation_mode',
        'status',
        'is_onboarding_example',
        'repetitions_completed',
        'session_duration_seconds',
        'last_activity_at',
        'started_at',
        'paused_at',
        'resumed_at',
        'ended_at',
        'repeated_from_session_id',
        'attempt_number',
        'recommendation_id',
        'recommendation_source',
        'completion_settings',
        'start_idempotency_key',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'current_step' => 'integer',
            'repetitions_completed' => 'integer',
            'session_duration_seconds' => 'integer',
            'attempt_number' => 'integer',
            'is_onboarding_example' => 'boolean',
            'last_activity_at' => 'datetime',
            'started_at' => 'datetime',
            'paused_at' => 'datetime',
            'resumed_at' => 'datetime',
            'ended_at' => 'datetime',
            'metadata' => 'array',
            'completion_settings' => 'array',
            'status' => UserSessionStatus::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function repeatedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'repeated_from_session_id');
    }

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(SessionRecommendation::class, 'recommendation_id');
    }

    public function isUnfinished(): bool
    {
        if ($this->is_onboarding_example) {
            return false;
        }

        $status = $this->status instanceof UserSessionStatus
            ? $this->status
            : UserSessionStatus::tryFromMixed($this->status);

        return $status?->isUnfinished() ?? false;
    }
}
