<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeatureUsageCounter extends Model
{
    protected $fillable = [
        'user_id',
        'feature',
        'period_on',
        'consumed',
    ];

    protected function casts(): array
    {
        return [
            'period_on' => 'date',
            'consumed' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
