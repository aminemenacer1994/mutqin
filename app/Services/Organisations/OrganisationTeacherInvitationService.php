<?php

namespace App\Services\Organisations;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationTeacherInvitationStatus;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\OrganisationTeacherInvitation;
use App\Models\User;
use App\Support\TeacherFeatures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrganisationTeacherInvitationService
{
    public const TTL_DAYS = 14;

    public function __construct(
        private readonly OrganisationInstitutionAccess $access,
        private readonly OrganisationAdminAuditService $audit,
    ) {}

    /**
     * @return array{invitation: OrganisationTeacherInvitation, invite_url: string}
     */
    public function invite(User $admin, Organisation $organisation, string $email, ?Request $request = null): array
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->access->assertInstitutionAdmin($admin, $organisation);

        $email = strtolower(trim($email));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['email' => __('teacher.institution_invite_email_invalid')]);
        }

        $existingTeacher = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existingTeacher !== null) {
            $approved = OrganisationMembership::query()
                ->where('user_id', $existingTeacher->id)
                ->where('organisation_id', $organisation->id)
                ->where('membership_role', MembershipRole::Teacher->value)
                ->where('status', MembershipStatus::Approved->value)
                ->exists();
            if ($approved) {
                throw ValidationException::withMessages(['email' => __('teacher.institution_invite_already_staff')]);
            }
        }

        $open = OrganisationTeacherInvitation::query()
            ->where('organisation_id', $organisation->id)
            ->where('invited_email', $email)
            ->where('status', OrganisationTeacherInvitationStatus::Pending->value)
            ->latest('id')
            ->first();
        if ($open !== null && $open->expires_at->isFuture()) {
            throw ValidationException::withMessages(['email' => __('teacher.institution_invite_already_pending')]);
        }

        $plain = Str::random(48);

        $invitation = DB::transaction(function () use ($admin, $organisation, $email, $plain) {
            $invitation = OrganisationTeacherInvitation::query()->create([
                'organisation_id' => $organisation->id,
                'invited_email' => $email,
                'invited_by_user_id' => $admin->id,
                'token_hash' => $this->hash($plain),
                'status' => OrganisationTeacherInvitationStatus::Pending,
                'expires_at' => now()->addDays(self::TTL_DAYS),
                'sent_at' => now(),
            ]);

            return $invitation;
        });

        $this->audit->record($organisation, $admin, 'teacher_invite_sent', 'organisation_teacher_invitation', $invitation->id, [
            'email' => $email,
        ], $request);

        return [
            'invitation' => $invitation,
            'invite_url' => url('/onboarding/connections?teacher_invite='.urlencode($plain)),
        ];
    }

    public function revoke(User $admin, OrganisationTeacherInvitation $invitation, ?Request $request = null): OrganisationTeacherInvitation
    {
        TeacherFeatures::abortUnlessEnabled();
        $organisation = $invitation->organisation;
        abort_unless($organisation instanceof Organisation, 404);
        $this->access->assertInstitutionAdmin($admin, $organisation);

        if ($invitation->status !== OrganisationTeacherInvitationStatus::Pending) {
            throw ValidationException::withMessages(['invitation' => __('teacher.institution_invite_not_revokable')]);
        }

        $invitation->forceFill([
            'status' => OrganisationTeacherInvitationStatus::Revoked,
            'revoked_at' => now(),
            'revoked_by_user_id' => $admin->id,
            'token_hash' => $this->hash(Str::random(48)),
        ])->save();

        $this->audit->record($organisation, $admin, 'teacher_invite_revoked', 'organisation_teacher_invitation', $invitation->id, null, $request);

        return $invitation->refresh();
    }

    /**
     * @return array{organisation: Organisation, membership: OrganisationMembership}
     */
    public function accept(User $teacher, string $plainToken, ?Request $request = null): array
    {
        TeacherFeatures::abortUnlessEnabled();
        abort_unless($teacher->isTeacher(), 403);

        $invitation = $this->findByToken($plainToken);
        if ($invitation === null) {
            throw ValidationException::withMessages(['token' => __('teacher.institution_invite_invalid')]);
        }

        $this->expireIfNeeded($invitation);
        if ($invitation->status === OrganisationTeacherInvitationStatus::Expired) {
            throw ValidationException::withMessages(['token' => __('teacher.institution_invite_expired')]);
        }
        if ($invitation->status !== OrganisationTeacherInvitationStatus::Pending) {
            throw ValidationException::withMessages(['token' => __('teacher.institution_invite_invalid')]);
        }
        if (strcasecmp((string) $teacher->email, $invitation->invited_email) !== 0) {
            throw ValidationException::withMessages(['token' => __('teacher.institution_invite_wrong_account')]);
        }

        $organisation = $invitation->organisation;
        abort_unless($organisation instanceof Organisation, 404);

        $membership = DB::transaction(function () use ($teacher, $organisation, $invitation) {
            $membership = OrganisationMembership::query()->firstOrNew([
                'user_id' => $teacher->id,
                'organisation_id' => $organisation->id,
            ]);

            if ($membership->exists && $membership->status === MembershipStatus::Approved) {
                return $membership;
            }

            $membership->forceFill([
                'membership_role' => MembershipRole::Teacher->value,
                'status' => MembershipStatus::Approved->value,
                'decided_by' => $invitation->invited_by_user_id,
                'decided_at' => now(),
                'is_institution_admin' => false,
            ])->save();

            if ($teacher->organisation_id === null) {
                $teacher->forceFill(['organisation_id' => $organisation->id])->save();
            }

            $invitation->forceFill([
                'status' => OrganisationTeacherInvitationStatus::Accepted,
                'accepted_at' => now(),
                'accepted_by_user_id' => $teacher->id,
                'organisation_membership_id' => $membership->id,
                'token_hash' => $this->hash(Str::random(48)),
            ])->save();

            return $membership->refresh();
        });

        $this->audit->record($organisation, $teacher, 'teacher_invite_accepted', 'organisation_membership', $membership->id, null, $request);

        return [
            'organisation' => $organisation->fresh(),
            'membership' => $membership,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function openInvitations(Organisation $organisation): array
    {
        return OrganisationTeacherInvitation::query()
            ->where('organisation_id', $organisation->id)
            ->whereIn('status', [
                OrganisationTeacherInvitationStatus::Pending->value,
                OrganisationTeacherInvitationStatus::Accepted->value,
            ])
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (OrganisationTeacherInvitation $row) => [
                'id' => (int) $row->id,
                'email' => $row->invited_email,
                'status' => $row->status?->value ?? $row->status,
                'expires_at' => $row->expires_at?->toIso8601String(),
                'sent_at' => $row->sent_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    private function findByToken(string $plain): ?OrganisationTeacherInvitation
    {
        return OrganisationTeacherInvitation::query()
            ->where('token_hash', $this->hash($plain))
            ->first();
    }

    private function expireIfNeeded(OrganisationTeacherInvitation $invitation): void
    {
        if ($invitation->status !== OrganisationTeacherInvitationStatus::Pending) {
            return;
        }
        if ($invitation->expires_at !== null && $invitation->expires_at->isPast()) {
            $invitation->forceFill(['status' => OrganisationTeacherInvitationStatus::Expired])->save();
        }
    }

    private function hash(string $plain): string
    {
        return hash('sha256', $plain);
    }
}