<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemorisationSyncState extends Model
{
    protected $fillable = [
        'user_id',
        'state',
        'device_id',
        'device_label',
        'payload_hash',
        'state_updated_at',
        'last_pulled_at',
    ];

    protected function casts(): array
    {
        return [
            'state_updated_at' => 'datetime',
            'last_pulled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
