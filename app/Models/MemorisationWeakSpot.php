<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemorisationWeakSpot extends Model
{
    public const TYPE_WORD = 'word';

    public const TYPE_AYAH = 'ayah';

    public const TYPE_PHRASE = 'phrase';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_IMPROVING = 'improving';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_DORMANT = 'dormant';

    public const REVIEW_CONFIRMED = 'confirmed';

    public const REVIEW_DISMISSED = 'dismissed';

    public const STATE_RECURRING = 'recurring';

    public const STATE_IMPROVING = 'improving';

    public const STATE_RESOLVED = 'resolved';

    public const STATE_INSUFFICIENT = 'insufficient_data';

    protected $fillable = [
        'user_id',
        'spot_type',
        'surah_number',
        'ayah_number',
        'word_index',
        'verse_key',
        'spot_key',
        'severity',
        'mistake_kind',
        'status',
        'trend',
        'teacher_review_status',
        'teacher_reviewed_by',
        'teacher_reviewed_at',
        'teacher_review_note',
        'affected_attempt_count',
        'first_identified_at',
        'last_identified_at',
        'last_recalled_at',
        'source_assessment_id',
        'last_assessment_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'word_index' => 'integer',
            'affected_attempt_count' => 'integer',
            'first_identified_at' => 'datetime',
            'last_identified_at' => 'datetime',
            'last_recalled_at' => 'datetime',
            'teacher_reviewed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceAssessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'source_assessment_id');
    }

    public function lastAssessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'last_assessment_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_reviewed_by');
    }

    public function occurrences(): HasMany
    {
        return $this->hasMany(MemorisationWeakSpotOccurrence::class, 'weak_spot_id');
    }

    public function recurrenceState(): string
    {
        if ($this->teacher_review_status === self::REVIEW_DISMISSED
            || $this->status === self::STATUS_RESOLVED
            || $this->status === self::STATUS_DORMANT) {
            return self::STATE_RESOLVED;
        }
        if ($this->status === self::STATUS_IMPROVING || $this->trend === 'improving') {
            return self::STATE_IMPROVING;
        }
        if ((int) $this->affected_attempt_count < 2) {
            return self::STATE_INSUFFICIENT;
        }

        return self::STATE_RECURRING;
    }

    public static function buildSpotKey(
        string $spotType,
        int $surahNumber,
        int $ayahNumber,
        ?int $wordIndex = null
    ): string {
        $wordPart = $wordIndex === null ? 'ayah' : (string) $wordIndex;

        return strtolower($spotType).':'.$surahNumber.':'.$ayahNumber.':'.$wordPart;
    }
}
