<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherRecitationAssessment extends Model
{
    /** @var list<string> */
    public const AREAS = ['memorisation', 'tajweed', 'pronunciation', 'fluency'];

    /** @var list<string> */
    public const RATINGS = ['needs_work', 'sound', 'strong'];

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'tajweed_score' => 'integer',
            'observations' => 'array',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'ai_recite_attempt_id');
    }
}
