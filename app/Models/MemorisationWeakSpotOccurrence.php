<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationWeakSpotOccurrence extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'confidence' => 'float',
            'occurred_at' => 'datetime',
        ];
    }

    public function weakSpot(): BelongsTo
    {
        return $this->belongsTo(MemorisationWeakSpot::class, 'weak_spot_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(MemorisationAssessment::class, 'assessment_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'ai_recite_attempt_id');
    }
}
