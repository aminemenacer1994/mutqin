<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Arr;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'google_id',
        'avatar',
        'password',
        'stripe_customer_id',
        'stripe_subscription_id',
        'subscription_tier',
        'subscription_plan',
        'subscription_status',
        'subscription_trial_ends_at',
        'subscription_current_period_ends_at',
        'locale',
        'ai_recall_mode_enabled',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'subscription_trial_ends_at' => 'datetime',
            'subscription_current_period_ends_at' => 'datetime',
            'ai_recall_mode_enabled' => 'boolean',
        ];
    }

    public function memorisationSyncState(): HasOne
    {
        return $this->hasOne(MemorisationSyncState::class);
    }

    public function learningSessions(): HasMany
    {
        return $this->hasMany(UserSession::class);
    }

    public function lastPosition(): HasOne
    {
        return $this->hasOne(UserLastPosition::class);
    }

    public function memorisationProgress(): HasMany
    {
        return $this->hasMany(MemorisationProgress::class);
    }

    public function learningAnalytics(): HasMany
    {
        return $this->hasMany(LearningAnalytic::class);
    }

    public function hasPaidAccess(): bool
    {
        return in_array($this->subscription_status, ['trialing', 'active'], true);
    }

    public function isAdmin(): bool
    {
        return in_array(strtolower((string) $this->email), Arr::wrap(config('mutqin.admin_emails')), true);
    }
}
