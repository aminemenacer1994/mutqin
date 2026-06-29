<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLastPosition extends Model
{
    protected $fillable = [
        'user_id',
        'surah_number',
        'ayah_number',
        'last_step',
        'metadata',
        'last_opened_at',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'last_step' => 'integer',
            'metadata' => 'array',
            'last_opened_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
