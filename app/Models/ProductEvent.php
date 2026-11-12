<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductEvent extends Model
{
    protected $fillable = [
        'event_name',
        'user_id',
        'anonymous_id',
        'idempotency_key',
        'occurred_at',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'referral_code',
        'properties',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'properties' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
