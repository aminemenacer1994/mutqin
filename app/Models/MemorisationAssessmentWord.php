<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationAssessmentWord extends Model
{
    public const TYPE_CORRECT = 'correct';

    public const TYPE_CLOSE_MATCH = 'close_match';

    public const TYPE_INCORRECT = 'incorrect';

    public const TYPE_OMITTED = 'omitted';

    public const TYPE_ADDITIONAL = 'additional';

    public const TYPE_OUT_OF_ORDER = 'out_of_order';

    public const TYPE_UNCERTAIN = 'uncertain';

    protected $fillable = [
        'user_id',
        'assessment_id',
        'surah_number',
        'ayah_number',
        'word_index',
        'verse_key',
        'expected_position',
        'detected_token',
        'result_type',
        'confidence',
        'retry_count',
        'first_result_type',
        'final_result_type',
        'out_of_order',
        'first_detected_at',
        'final_detected_at',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'word_index' => 'integer',
            'expected_position' => 'integer',
            'confidence' => 'float',
            'retry_count' => 'integer',
            'out_of_order' => 'boolean',
            'first_detected_at' => 'datetime',
            'final_detected_at' => 'datetime',
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
}
