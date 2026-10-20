<?php

namespace App\Policies;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\User;
use App\Support\TeacherFeatures;

class LearningGroupPolicy
{
    public function view(User $user, LearningGroup $group): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('status', MembershipStatus::Approved->value)
            ->exists();
    }

    public function update(User $user, LearningGroup $group): bool
    {
        return false;
    }

    public function delete(User $user, LearningGroup $group): bool
    {
        return false;
    }

    public function teach(User $user, LearningGroup $group): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return $user->account_role === AccountRole::Teacher
            && $user->organisation_id !== null
            && (int) $user->organisation_id === (int) $group->organisation_id;
    }

    public function requestJoin(User $user, LearningGroup $group): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return $user->account_role === AccountRole::Student
            && $user->organisation_id !== null
            && (int) $user->organisation_id === (int) $group->organisation_id;
    }

    public function manage(User $user, LearningGroup $group): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        if ($user->organisation_id === null || (int) $user->organisation_id !== (int) $group->organisation_id) {
            return false;
        }

        return GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->exists();
    }
}
