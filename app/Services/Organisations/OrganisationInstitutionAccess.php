<?php

namespace App\Services\Organisations;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\User;
use App\Support\TeacherFeatures;

class OrganisationInstitutionAccess
{
    public function activeOrganisation(User $user): ?Organisation
    {
        if ($user->organisation_id === null) {
            return null;
        }

        return Organisation::query()->find($user->organisation_id);
    }

    public function approvedMembership(User $user, Organisation $organisation): ?OrganisationMembership
    {
        return OrganisationMembership::query()
            ->where('user_id', $user->id)
            ->where('organisation_id', $organisation->id)
            ->where('status', MembershipStatus::Approved->value)
            ->first();
    }

    public function isApprovedTeacher(User $user, Organisation $organisation): bool
    {
        if (! $user->isTeacher()) {
            return false;
        }

        $membership = $this->approvedMembership($user, $organisation);

        return $membership !== null
            && $membership->membership_role === MembershipRole::Teacher;
    }

    public function isInstitutionAdmin(User $user, ?Organisation $organisation = null): bool
    {
        TeacherFeatures::abortUnlessEnabled();
        $organisation ??= $this->activeOrganisation($user);
        if ($organisation === null || ! $user->isTeacher()) {
            return false;
        }

        if ((int) $user->organisation_id !== (int) $organisation->id) {
            return false;
        }

        return OrganisationMembership::query()
            ->where('user_id', $user->id)
            ->where('organisation_id', $organisation->id)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->where('is_institution_admin', true)
            ->exists();
    }

    public function assertInstitutionAdmin(User $user, Organisation $organisation): void
    {
        abort_unless($this->isInstitutionAdmin($user, $organisation), 403);
    }

    public function assertApprovedTeacher(User $user, Organisation $organisation): void
    {
        abort_unless($this->isApprovedTeacher($user, $organisation), 403);
    }
}