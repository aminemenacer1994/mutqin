<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\User;
use App\Support\Registration\RegistrationOrganisationDirectory;
use App\Support\TeacherFeatures;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Institution memberships are separate from class access.
 * Approving an organisation membership never grants teacher visibility of practice data.
 */
class OrganisationMembershipService
{
    public function __construct(
        private readonly OrganisationRegistry $organisations,
        private readonly OrganisationRegistrationRoster $registrationRoster,
    ) {}

    /**
     * @return array{organisation: Organisation, membership: OrganisationMembership, created: bool}
     */
    public function joinOrCreate(
        User $user,
        OrganisationType $type,
        string $rawName,
        MembershipRole $role,
    ): array {
        TeacherFeatures::abortUnlessEnabled();

        if (! in_array($role, [MembershipRole::Teacher, MembershipRole::Student], true)) {
            throw ValidationException::withMessages([
                'organisation' => __('ui.auth_role_invalid'),
            ]);
        }

        $existing = $this->organisations->find($type, $rawName);
        if ($existing !== null) {
            $membership = $this->requestJoin($user, $existing, $role);

            return [
                'organisation' => $existing,
                'membership' => $membership,
                'created' => false,
            ];
        }

        $organisation = $this->organisations->findOrCreate($type, $rawName);
        $membership = $this->approveMembership(
            $this->upsertMembership($user, $organisation, $role, MembershipStatus::Pending),
            $user,
        );

        $user->forceFill(['organisation_id' => $organisation->id])->save();
        $this->registrationRoster->enrollRegisteredMember($user->refresh(), $organisation);

        return [
            'organisation' => $organisation,
            'membership' => $membership,
            'created' => true,
        ];
    }

    public function requestJoin(User $user, Organisation $organisation, MembershipRole $role): OrganisationMembership
    {
        TeacherFeatures::abortUnlessEnabled();

        $directory = RegistrationOrganisationDirectory::entryFor($organisation);
        $membership = $this->upsertMembership($user, $organisation, $role, MembershipStatus::Pending);

        if ($directory !== null) {
            $membership = $this->approveMembership($membership, $user);
            $user->forceFill(['organisation_id' => $organisation->id])->save();
            $this->registrationRoster->enrollRegisteredMember($user->refresh(), $organisation);

            return $membership;
        }

        if ((int) $user->organisation_id === (int) $organisation->id) {
            return $this->approveMembership($membership, $user);
        }

        $hasApprovedTeacher = OrganisationMembership::query()
            ->where('organisation_id', $organisation->id)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->exists();

        // The first teacher of an institution activates it. Later joins stay pending.
        if ($role === MembershipRole::Teacher && ! $hasApprovedTeacher) {
            $membership = $this->approveMembership($membership, $user);
            $user->forceFill(['organisation_id' => $organisation->id])->save();

            return $membership;
        }

        return $membership;
    }

    public function approve(User $actor, OrganisationMembership $membership): OrganisationMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($actor->isTeacher(), 403);
        abort_unless(
            (int) $actor->organisation_id === (int) $membership->organisation_id
            && OrganisationMembership::query()
                ->where('user_id', $actor->id)
                ->where('organisation_id', $membership->organisation_id)
                ->where('membership_role', MembershipRole::Teacher->value)
                ->where('status', MembershipStatus::Approved->value)
                ->exists(),
            403,
        );

        if ($membership->status !== MembershipStatus::Pending) {
            throw ValidationException::withMessages([
                'membership' => 'Only a pending institution request can be approved.',
            ]);
        }

        $membership = $this->approveMembership($membership, $actor);
        $member = $membership->user;
        if ($member instanceof User && $member->organisation_id === null) {
            $member->forceFill(['organisation_id' => $membership->organisation_id])->save();
        }

        return $membership;
    }

    public function reject(User $actor, OrganisationMembership $membership): OrganisationMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($actor->isTeacher(), 403);
        abort_unless((int) $actor->organisation_id === (int) $membership->organisation_id, 403);

        if ($membership->status !== MembershipStatus::Pending) {
            throw ValidationException::withMessages([
                'membership' => 'Only a pending institution request can be rejected.',
            ]);
        }

        $membership->forceFill([
            'status' => MembershipStatus::Rejected->value,
            'decided_by' => $actor->id,
            'decided_at' => now(),
        ])->save();

        return $membership->refresh();
    }

    public function switchActive(User $user, Organisation $organisation): User
    {
        TeacherFeatures::abortUnlessEnabled();

        $membership = OrganisationMembership::query()
            ->where('user_id', $user->id)
            ->where('organisation_id', $organisation->id)
            ->where('status', MembershipStatus::Approved->value)
            ->first();

        if ($membership === null) {
            throw ValidationException::withMessages([
                'organisation' => 'Join and get approved before switching to this institution.',
            ]);
        }

        $user->forceFill(['organisation_id' => $organisation->id])->save();

        return $user->refresh();
    }

    /**
     * A class invite from a teacher of this institution confirms affiliation.
     * It still does not grant practice-data access.
     */
    public function activateFromClassInvite(User $user, Organisation $organisation): OrganisationMembership
    {
        TeacherFeatures::abortUnlessEnabled();

        $membership = $this->upsertMembership(
            $user,
            $organisation,
            MembershipRole::Student,
            MembershipStatus::Pending,
        );

        $membership = $this->approveMembership($membership, $user);
        if ($user->organisation_id === null) {
            $user->forceFill(['organisation_id' => $organisation->id])->save();
        }

        return $membership;
    }

    private function upsertMembership(
        User $user,
        Organisation $organisation,
        MembershipRole $role,
        MembershipStatus $status,
    ): OrganisationMembership {
        return DB::transaction(function () use ($user, $organisation, $role, $status) {
            $membership = OrganisationMembership::query()
                ->where('user_id', $user->id)
                ->where('organisation_id', $organisation->id)
                ->lockForUpdate()
                ->first() ?? new OrganisationMembership;

            if ($membership->exists && $membership->status === MembershipStatus::Approved) {
                return $membership;
            }

            $membership->forceFill([
                'user_id' => $user->id,
                'organisation_id' => $organisation->id,
                'membership_role' => $role->value,
                'status' => $status->value,
                'decided_by' => $status === MembershipStatus::Approved ? $user->id : null,
                'decided_at' => $status === MembershipStatus::Approved ? now() : null,
            ])->save();

            return $membership->refresh();
        });
    }

    private function approveMembership(OrganisationMembership $membership, User $actor): OrganisationMembership
    {
        $membership->forceFill([
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $actor->id,
            'decided_at' => now(),
        ])->save();

        return $membership->refresh();
    }

    public static function roleForAccount(AccountRole $role): MembershipRole
    {
        return $role === AccountRole::Teacher
            ? MembershipRole::Teacher
            : MembershipRole::Student;
    }
}
