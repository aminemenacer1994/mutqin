<?php

namespace App\Models;

use App\Enums\MutashabihatProgressStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserMutashabihatProgress extends Model
{
    protected $table = 'user_mutashabihat_progress';

    protected $fillable = [
        'user_id',
        'mutashabihat_pair_id',
        'expected_verse_key',
        'confused_verse_key',
        'confusion_count',
        'practice_attempts',
        'successful_attempts',
        'status',
        'last_practised_at',
        'last_confused_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'confusion_count' => 'integer',
            'practice_attempts' => 'integer',
            'successful_attempts' => 'integer',
            'last_practised_at' => 'datetime',
            'last_confused_at' => 'datetime',
            'metadata' => 'array',
            'status' => MutashabihatProgressStatus::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pair(): BelongsTo
    {
        return $this->belongsTo(MutashabihatPair::class, 'mutashabihat_pair_id');
    }
}
