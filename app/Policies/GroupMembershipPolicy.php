<?php

namespace App\Policies;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\TeacherFeatures;

class GroupMembershipPolicy
{
    public function view(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $membership->user_id;
    }

    public function accept(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $membership->user_id
            && $membership->status === MembershipStatus::Pending;
    }

    public function reject(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $membership->user_id
            && $membership->status === MembershipStatus::Pending;
    }

    public function grantAnalyticsConsent(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $membership->user_id
            && $membership->membership_role === MembershipRole::Student
            && in_array($membership->status, [MembershipStatus::Pending, MembershipStatus::Approved], true);
    }

    /**
     * A teacher may review a student request in a group they teach.
     * Approval still requires the student's own analytics consent.
     */
    public function review(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        if ($user->account_role !== AccountRole::Teacher || $user->organisation_id === null) {
            return false;
        }

        if ($membership->membership_role !== MembershipRole::Student) {
            return false;
        }

        $membership->loadMissing('learningGroup');
        $group = $membership->learningGroup;
        if ($group === null || (int) $group->organisation_id !== (int) $user->organisation_id) {
            return false;
        }

        return GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->exists();
    }

    public function revokeAnalyticsConsent(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return (int) $user->id === (int) $membership->user_id
            && $membership->membership_role === MembershipRole::Student
            && $membership->analytics_consent_status === AnalyticsConsentStatus::Granted;
    }

    public function viewAnalytics(User $user, GroupMembership $membership): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        $student = $membership->user;
        if (! $student || $membership->membership_role !== MembershipRole::Student) {
            return false;
        }

        return app(StudentAccessAuthorizer::class)->allows($user, $student);
    }
}
