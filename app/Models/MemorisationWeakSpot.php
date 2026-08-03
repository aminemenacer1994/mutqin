<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationWeakSpot extends Model
{
    public const TYPE_WORD = 'word';

    public const TYPE_AYAH = 'ayah';

    public const TYPE_PHRASE = 'phrase';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_IMPROVING = 'improving';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_DORMANT = 'dormant';

    protected $fillable = [
        'user_id',
        'spot_type',
        'surah_number',
        'ayah_number',
        'word_index',
        'verse_key',
        'spot_key',
        'severity',
        'status',
        'trend',
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
