<?php

namespace Database\Factories;

use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GroupMembership>
 */
class GroupMembershipFactory extends Factory
{
    protected $model = GroupMembership::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'learning_group_id' => LearningGroup::factory(),
            'user_id' => User::factory(),
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Pending->value,
            'analytics_consent_status' => AnalyticsConsentStatus::None->value,
        ];
    }
}
