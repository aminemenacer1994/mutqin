<?php

namespace App\Services\Learning;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\OrganisationMembership;
use App\Models\User;
use App\Support\TeacherFeatures;

/**
 * Whether a learner is linked to a teacher or institution (not a standalone individual).
 */
final class LearnerConnectionGate
{
    public function connected(User $student): bool
    {
        if (! TeacherFeatures::learnerSectionEnabled()) {
            return false;
        }

        if ($this->hasStudentGroupLink($student)) {
            return true;
        }

        return OrganisationMembership::query()
            ->where('user_id', $student->id)
            ->whereIn('status', [
                MembershipStatus::Approved->value,
                MembershipStatus::Pending->value,
            ])
            ->exists();
    }

    public function abortUnlessConnected(User $student): void
    {
        if (! $this->connected($student)) {
            abort(404);
        }
    }

    private function hasStudentGroupLink(User $student): bool
    {
        return GroupMembership::query()
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->whereIn('status', [
                MembershipStatus::Approved->value,
                MembershipStatus::Pending->value,
            ])
            ->exists();
    }
}