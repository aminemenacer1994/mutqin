<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherWordCoachingRetry extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'improved' => 'boolean',
        ];
    }

    public function coaching(): BelongsTo
    {
        return $this->belongsTo(TeacherWordCoaching::class, 'teacher_word_coaching_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AiReciteAttempt::class, 'ai_recite_attempt_id');
    }
}
