<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcousticTajweedAssessment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_UNASSESSABLE = 'unassessable';

    public const TEACHER_PENDING = 'pending';

    protected $fillable = [
        'user_id',
        'memorisation_assessment_id',
        'ai_recite_attempt_id',
        'status',
        'qiraat',
        'provider',
        'provider_version',
        'pipeline_version',
        'audio_quality_status',
        'findings',
        'metadata',
        'teacher_verification_status',
        'teacher_verification',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'findings' => 'array',
        'metadata' => 'array',
        'teacher_verification' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'memorisation_assessment_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'ai_recite_attempt_id');
    }
}