<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    protected $fillable = [
        'referrer_user_id',
        'referred_user_id',
        'referral_code',
        'signed_up_at',
        'activated_at',
        'converted_to_pro_at',
        'reward_ai_checks',
        'reward_granted_at',
        'free_month_rewarded_at',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_up_at' => 'datetime',
            'activated_at' => 'datetime',
            'converted_to_pro_at' => 'datetime',
            'reward_ai_checks' => 'integer',
            'reward_granted_at' => 'datetime',
            'free_month_rewarded_at' => 'datetime',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }
}
