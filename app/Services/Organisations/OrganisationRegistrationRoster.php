<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\User;
use App\Support\Registration\OrganisationName;
use App\Support\Registration\RegistrationOrganisationDirectory;
use App\Support\TeacherFeatures;

/**
 * Links registrants who pick a directory organisation into one shared group.
 */
class OrganisationRegistrationRoster
{
    public function enrollRegisteredMember(User $user, Organisation $organisation): void
    {
        if (! TeacherFeatures::enabled()) {
            return;
        }

        if ($user->account_role === null || ! $user->account_role->needsOrganisation()) {
            return;
        }

        $entry = RegistrationOrganisationDirectory::entryFor($organisation);
        if ($entry === null) {
            return;
        }

        $group = LearningGroup::query()
            ->where('organisation_id', $organisation->id)
            ->where('name_canonical', OrganisationName::canonical($entry['group']))
            ->first();

        if ($group === null) {
            return;
        }

        if ($user->account_role === AccountRole::Teacher) {
            $this->ensureTeacherMembership($user, $group);

            return;
        }

        if ($user->account_role === AccountRole::Student) {
            $this->ensureStudentMembership($user, $group);
        }
    }

    private function ensureTeacherMembership(User $teacher, LearningGroup $group): void
    {
        $membership = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $teacher->id)
            ->first() ?? new GroupMembership;

        $membership->forceFill([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher,
            'status' => MembershipStatus::Approved,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
            'analytics_consent_status' => AnalyticsConsentStatus::None,
            'analytics_consent_at' => null,
            'analytics_consent_version' => null,
            'analytics_consent_user_id' => null,
        ])->save();
    }

    private function ensureStudentMembership(User $student, LearningGroup $group): void
    {
        $at = now();
        $membership = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $student->id)
            ->first() ?? new GroupMembership;

        $membership->forceFill([
            'learning_group_id' => $group->id,
            'user_id' => $student->id,
            'membership_role' => MembershipRole::Student,
            'status' => MembershipStatus::Approved,
            'decided_by' => $student->id,
            'decided_at' => $at,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted,
            'analytics_consent_at' => $at,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $student->id,
        ])->save();
    }
}
