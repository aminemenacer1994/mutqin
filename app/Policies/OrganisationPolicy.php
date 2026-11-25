<?php

namespace App\Policies;

use App\Enums\AccountRole;
use App\Models\Organisation;
use App\Models\User;
use App\Services\Organisations\OrganisationInstitutionAccess;
use App\Support\TeacherFeatures;

class OrganisationPolicy
{
    public function manageInstitution(User $user, Organisation $organisation): bool
    {
        if (! TeacherFeatures::enabled() || ! $user->isTeacher()) {
            return false;
        }

        return app(OrganisationInstitutionAccess::class)->isInstitutionAdmin($user, $organisation);
    }
    public function view(User $user, Organisation $organisation): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return $user->organisation_id !== null
            && (int) $user->organisation_id === (int) $organisation->id;
    }

    /**
     * Sharing an organisation is discovery only. It never lists learners.
     */
    public function viewMembers(User $user, Organisation $organisation): bool
    {
        return false;
    }

    public function createGroup(User $user, Organisation $organisation): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        return $user->account_role === AccountRole::Teacher
            && $user->organisation_id !== null
            && (int) $user->organisation_id === (int) $organisation->id;
    }

    public function update(User $user, Organisation $organisation): bool
    {
        return $this->manageInstitution($user, $organisation);
    }

    public function delete(User $user, Organisation $organisation): bool
    {
        return false;
    }
}
