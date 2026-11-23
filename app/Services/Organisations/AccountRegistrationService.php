<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\OrganisationType;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Support\ParentFeatures;
use App\Support\TeacherFeatures;

/**
 * Stores the account role and, for students and teachers, the organisation link.
 * Linking never creates a group membership and never grants record access.
 */
class AccountRegistrationService
{
    public function __construct(
        private readonly OrganisationRegistry $organisations,
        private readonly OrganisationRegistrationRoster $registrationRoster,
        private readonly UserRoleService $roles,
    ) {}

    /**
     * @param  array{account_role: AccountRole, organisation_type: ?OrganisationType, organisation_name: ?string}  $profile
     */
    public function apply(User $user, array $profile): void
    {
        $role = $profile['account_role'];
        $teacherOrOrgEnabled = TeacherFeatures::enabled();
        $parentEnabled = ParentFeatures::enabled();

        if (! $teacherOrOrgEnabled && ! $parentEnabled) {
            return;
        }

        if ($role === AccountRole::Parent) {
            if (! $parentEnabled) {
                return;
            }

            $user->forceFill([
                'account_role' => AccountRole::Parent->value,
                'organisation_id' => null,
            ])->save();

            $this->roles->syncPrimaryRoleGrant($user->refresh(), AccountRole::Parent);

            return;
        }

        if (! $teacherOrOrgEnabled) {
            return;
        }

        if (! $role->needsOrganisation()) {
            $user->forceFill([
                'account_role' => $role->value,
                'organisation_id' => null,
            ])->save();

            $this->roles->syncPrimaryRoleGrant($user->refresh(), $role);

            return;
        }

        $organisation = $this->organisations->findOrCreate(
            $profile['organisation_type'],
            (string) $profile['organisation_name'],
        );

        $user->forceFill([
            'account_role' => $role->value,
            'organisation_id' => $organisation->id,
        ])->save();

        $this->registrationRoster->enrollRegisteredMember($user->refresh(), $organisation);
        $this->roles->syncPrimaryRoleGrant($user->refresh(), $role);
    }
}
