<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSession extends Model
{
    protected $fillable = [
        'user_id',
        'surah_number',
        'ayah_number',
        'current_step',
        'memorisation_mode',
        'repetitions_completed',
        'session_duration_seconds',
        'last_activity_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'current_step' => 'integer',
            'repetitions_completed' => 'integer',
            'session_duration_seconds' => 'integer',
            'last_activity_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
