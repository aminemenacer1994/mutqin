<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeacherWordCoaching extends Model
{
    public const OPEN = 'open';

    public const AWAITING_RETRY = 'awaiting_retry';

    public const NEEDS_PRACTICE = 'needs_practice';

    public const IMPROVED = 'improved';

    public const RESOLVED = 'resolved';

    public const DECISION_CONFIRMED = 'confirmed';

    public const DECISION_DISMISSED = 'dismissed';

    public const BASIS_COMPARABLE = 'comparable';

    public const BASIS_TEACHER = 'teacher';

    /** @var list<string> */
    public const STATUSES = [
        self::OPEN,
        self::AWAITING_RETRY,
        self::NEEDS_PRACTICE,
        self::IMPROVED,
        self::RESOLVED,
    ];

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'word_index' => 'integer',
            'ai_confidence' => 'float',
            'reviewed_at' => 'datetime',
            'retry_requested' => 'boolean',
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

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'ai_recite_attempt_id');
    }

    public function latestRetry(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'latest_retry_attempt_id');
    }

    public function practiceAssignment(): BelongsTo
    {
        return $this->belongsTo(TeacherAssignment::class, 'practice_assignment_id');
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(TeacherWordCoachingCorrection::class);
    }

    public function retries(): HasMany
    {
        return $this->hasMany(TeacherWordCoachingRetry::class);
    }
}
