<?php

namespace App\Models;

use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Database\Factories\GroupMembershipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMembership extends Model
{
    public const ANALYTICS_CONSENT_VERSION = 'student-analytics-v1';

    /** @use HasFactory<GroupMembershipFactory> */
    use HasFactory;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'membership_role' => MembershipRole::class,
            'status' => MembershipStatus::class,
            'analytics_consent_status' => AnalyticsConsentStatus::class,
            'decided_at' => 'datetime',
            'analytics_consent_at' => 'datetime',
        ];
    }

    public function learningGroup(): BelongsTo
    {
        return $this->belongsTo(LearningGroup::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function analyticsConsentUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'analytics_consent_user_id');
    }
}
