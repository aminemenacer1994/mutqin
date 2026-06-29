<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningAnalytic extends Model
{
    protected $table = 'learning_analytics';

    protected $fillable = [
        'user_id',
        'session_date',
        'sessions_completed',
        'total_minutes',
        'ayahs_memorised',
        'ayahs_reviewed',
        'streak_day',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'sessions_completed' => 'integer',
            'total_minutes' => 'integer',
            'ayahs_memorised' => 'integer',
            'ayahs_reviewed' => 'integer',
            'streak_day' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
