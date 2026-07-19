<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionRecommendation extends Model
{
    protected $fillable = [
        'user_id',
        'source_session_id',
        'surah_number',
        'ayah_start',
        'ayah_end',
        'recommendation_type',
        'reason_code',
        'session_mode',
        'accepted',
        'chose_other',
        'started_session_id',
        'payload',
        'accepted_at',
        'rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_start' => 'integer',
            'ayah_end' => 'integer',
            'accepted' => 'boolean',
            'chose_other' => 'boolean',
            'started_session_id' => 'integer',
            'payload' => 'array',
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceSession(): BelongsTo
    {
        return $this->belongsTo(UserSession::class, 'source_session_id');
    }
}
