<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\OrganisationType;
use App\Models\User;
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
    ) {}

    /**
     * @param  array{account_role: AccountRole, organisation_type: ?OrganisationType, organisation_name: ?string}  $profile
     */
    public function apply(User $user, array $profile): void
    {
        if (! TeacherFeatures::enabled()) {
            return;
        }

        $role = $profile['account_role'];

        if (! $role->needsOrganisation()) {
            $user->forceFill([
                'account_role' => $role->value,
                'organisation_id' => null,
            ])->save();

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
    }
}
