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
        'password_set_at',
        'stripe_customer_id',
        'stripe_subscription_id',
        'subscription_tier',
        'subscription_plan',
        'subscription_status',
        'subscription_trial_ends_at',
        'subscription_current_period_ends_at',
        'locale',
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
            'password_set_at' => 'datetime',
            'subscription_trial_ends_at' => 'datetime',
            'subscription_current_period_ends_at' => 'datetime',
        ];
    }

    public function hasSetPassword(): bool
    {
        return $this->password_set_at !== null;
    }

    public function connectedWithGoogle(): bool
    {
        return filled($this->google_id);
    }

    public function memorisationSyncState(): HasOne
    {
        return $this->hasOne(MemorisationSyncState::class);
    }

    public function learningSessions(): HasMany
    {
        return $this->hasMany(UserSession::class);
    }

    public function sessionRecommendations(): HasMany
    {
        return $this->hasMany(SessionRecommendation::class);
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

    public function ayahNotes(): HasMany
    {
        return $this->hasMany(AyahNote::class);
    }

    public function memorisationAssessments(): HasMany
    {
        return $this->hasMany(MemorisationAssessment::class);
    }

    public function memorisationPracticePlans(): HasMany
    {
        return $this->hasMany(MemorisationPracticePlan::class);
    }

    public function memorisationWeakSpots(): HasMany
    {
        return $this->hasMany(MemorisationWeakSpot::class);
    }

    public function memorisationAttemptComparisons(): HasMany
    {
        return $this->hasMany(MemorisationAttemptComparison::class);
    }

    public function memorisationAssessmentWords(): HasMany
    {
        return $this->hasMany(MemorisationAssessmentWord::class);
    }

    public function aiReciteAttempts(): HasMany
    {
        return $this->hasMany(AiReciteAttempt::class);
    }

    public function learningHistoryAuditLogs(): HasMany
    {
        return $this->hasMany(LearningHistoryAuditLog::class, 'subject_user_id');
    }

    public function hasPaidAccess(): bool
    {
        return in_array($this->subscription_status, ['trialing', 'active'], true);
    }

    public function effectiveSubscriptionTier(): string
    {
        if ($this->isAdmin()) {
            return 'pro';
        }

        if (!$this->hasPaidAccess()) {
            return 'free';
        }

        $tier = strtolower((string) ($this->subscription_tier ?? 'free'));

        return in_array($tier, ['premium', 'pro'], true) ? $tier : 'free';
    }

    public function hasPremiumAccess(): bool
    {
        // All features are free for every authenticated user.
        return true;
    }

    public function hasProAccess(): bool
    {
        // All features are free for every authenticated user.
        return true;
    }

    public function isAdmin(): bool
    {
        return in_array(strtolower((string) $this->email), Arr::wrap(config('mutqin.admin_emails')), true);
    }
}
