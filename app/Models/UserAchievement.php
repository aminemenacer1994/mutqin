<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAchievement extends Model
{
    protected $fillable = [
        'user_id',
        'achievement_id',
        'unlocked_at',
        'unlock_source',
        'progress_snapshot',
        'notified_at',
    ];

    protected function casts(): array
    {
        return [
            'unlocked_at' => 'datetime',
            'notified_at' => 'datetime',
            'progress_snapshot' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
