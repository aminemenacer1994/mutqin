<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\OrganisationType;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Support\ParentFeatures;
use App\Support\TeacherFeatures;

/**
 * Stores the account role at signup. Institution and class links happen later via Connect.
 */
class AccountRegistrationService
{
    public function __construct(
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

        $user->forceFill([
            'account_role' => $role->value,
            'organisation_id' => null,
        ])->save();

        $this->roles->syncPrimaryRoleGrant($user->refresh(), $role);
    }
}
