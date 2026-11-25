<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\User;
use App\Support\Registration\OrganisationName;
use App\Support\TeacherFeatures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrganisationInstitutionService
{
    public function __construct(
        private readonly OrganisationInstitutionAccess $access,
        private readonly OrganisationAdminAuditService $audit,
        private readonly OrganisationTeacherInvitationService $teacherInvites,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function dashboard(User $teacher): array
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($teacher->isTeacher(), 403);

        $organisation = $this->access->activeOrganisation($teacher);
        if ($organisation === null) {
            return [
                'organisation' => null,
                'capabilities' => [
                    'institution_admin' => false,
                    'manage_staff' => false,
                ],
                'staff' => [],
                'teacher_invitations' => [],
                'audit' => [],
            ];
        }

        $isAdmin = $this->access->isInstitutionAdmin($teacher, $organisation);

        return [
            'organisation' => [
                'id' => (int) $organisation->id,
                'name' => $organisation->name,
                'type' => $organisation->type instanceof OrganisationType
                    ? $organisation->type->value
                    : (string) $organisation->type,
                'profile_summary' => $organisation->profile_summary,
            ],
            'capabilities' => [
                'institution_admin' => $isAdmin,
                'manage_staff' => $isAdmin,
            ],
            'staff' => $this->staffRoster($organisation),
            'teacher_invitations' => $isAdmin ? $this->teacherInvites->openInvitations($organisation) : [],
            'audit' => $isAdmin ? $this->audit->recent($organisation) : [],
        ];
    }

    public function updateProfile(User $admin, Organisation $organisation, ?string $displayName, ?string $summary, ?Request $request = null): Organisation
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->access->assertInstitutionAdmin($admin, $organisation);

        $updates = [];
        if ($summary !== null) {
            $summary = trim($summary);
            if (mb_strlen($summary) > 500) {
                throw ValidationException::withMessages(['profile_summary' => __('teacher.institution_profile_summary_too_long')]);
            }
            $updates['profile_summary'] = $summary === '' ? null : $summary;
        }

        if ($displayName !== null) {
            $display = OrganisationName::display($displayName);
            $canonical = OrganisationName::canonical($displayName);
            if (mb_strlen($canonical) < 2) {
                throw ValidationException::withMessages(['name' => __('ui.auth_org_name_required')]);
            }

            $collision = Organisation::query()
                ->where('type', $organisation->type instanceof OrganisationType ? $organisation->type->value : $organisation->type)
                ->where('name_canonical', $canonical)
                ->where('id', '!=', $organisation->id)
                ->exists();
            if ($collision) {
                throw ValidationException::withMessages(['name' => __('teacher.institution_name_taken')]);
            }

            $updates['name'] = $display;
            $updates['name_canonical'] = $canonical;
        }

        if ($updates === []) {
            return $organisation;
        }

        $organisation->forceFill($updates)->save();
        $this->audit->record($organisation, $admin, 'institution_profile_updated', 'organisation', $organisation->id, [
            'fields' => array_keys($updates),
        ], $request);

        return $organisation->refresh();
    }

    public function revokeStaff(User $admin, OrganisationMembership $membership, ?Request $request = null): OrganisationMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        $organisation = $membership->organisation;
        abort_unless($organisation instanceof Organisation, 404);
        $this->access->assertInstitutionAdmin($admin, $organisation);

        if ($membership->membership_role !== MembershipRole::Teacher || $membership->status !== MembershipStatus::Approved) {
            throw ValidationException::withMessages(['membership' => __('teacher.institution_staff_not_revokable')]);
        }
        if ((int) $membership->user_id === (int) $admin->id) {
            throw ValidationException::withMessages(['membership' => __('teacher.institution_staff_cannot_revoke_self')]);
        }

        $adminCount = OrganisationMembership::query()
            ->where('organisation_id', $organisation->id)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->where('is_institution_admin', true)
            ->count();
        if ($membership->is_institution_admin && $adminCount <= 1) {
            throw ValidationException::withMessages(['membership' => __('teacher.institution_last_admin')]);
        }

        $membership->forceFill([
            'status' => MembershipStatus::Rejected->value,
            'decided_by' => $admin->id,
            'decided_at' => now(),
            'is_institution_admin' => false,
        ])->save();

        $member = $membership->user;
        if ($member instanceof User && (int) $member->organisation_id === (int) $organisation->id) {
            $fallback = OrganisationMembership::query()
                ->where('user_id', $member->id)
                ->where('status', MembershipStatus::Approved->value)
                ->where('organisation_id', '!=', $organisation->id)
                ->orderByDesc('id')
                ->value('organisation_id');
            $member->forceFill(['organisation_id' => $fallback])->save();
        }

        $this->audit->record($organisation, $admin, 'staff_revoked', 'organisation_membership', $membership->id, [
            'user_id' => (int) $membership->user_id,
        ], $request);

        return $membership->refresh();
    }

    public function setInstitutionAdmin(User $admin, OrganisationMembership $membership, bool $isAdmin, ?Request $request = null): OrganisationMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        $organisation = $membership->organisation;
        abort_unless($organisation instanceof Organisation, 404);
        $this->access->assertInstitutionAdmin($admin, $organisation);

        if ($membership->membership_role !== MembershipRole::Teacher || $membership->status !== MembershipStatus::Approved) {
            throw ValidationException::withMessages(['membership' => __('teacher.institution_staff_not_adminable')]);
        }

        if (! $isAdmin && $membership->is_institution_admin) {
            $adminCount = OrganisationMembership::query()
                ->where('organisation_id', $organisation->id)
                ->where('membership_role', MembershipRole::Teacher->value)
                ->where('status', MembershipStatus::Approved->value)
                ->where('is_institution_admin', true)
                ->count();
            if ($adminCount <= 1) {
                throw ValidationException::withMessages(['membership' => __('teacher.institution_last_admin')]);
            }
        }

        $membership->forceFill(['is_institution_admin' => $isAdmin])->save();
        $this->audit->record($organisation, $admin, $isAdmin ? 'staff_promoted_admin' : 'staff_demoted_admin', 'organisation_membership', $membership->id, [
            'user_id' => (int) $membership->user_id,
        ], $request);

        return $membership->refresh();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function staffRoster(Organisation $organisation): array
    {
        return OrganisationMembership::query()
            ->with('user:id,name,email,account_role')
            ->where('organisation_id', $organisation->id)
            ->where('status', MembershipStatus::Approved->value)
            ->whereIn('membership_role', [
                MembershipRole::Teacher->value,
                MembershipRole::Student->value,
            ])
            ->orderBy('membership_role')
            ->orderBy('id')
            ->get()
            ->map(function (OrganisationMembership $row) {
                $user = $row->user;

                return [
                    'membership_id' => (int) $row->id,
                    'role' => $row->membership_role?->value ?? $row->membership_role,
                    'is_institution_admin' => (bool) $row->is_institution_admin,
                    'user' => $user instanceof User ? [
                        'id' => (int) $user->id,
                        'name' => $user->name,
                        'email' => $user->account_role === AccountRole::Teacher ? $user->email : null,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }
}