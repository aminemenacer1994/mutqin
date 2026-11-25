<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\LearningGroupInvitationStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningGroupInvitation;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Support\TeacherFeatures;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LearningGroupInvitationService
{
    public const TTL_DAYS = 7;

    public function __construct(
        private readonly UserRoleService $roles,
        private readonly OrganisationMembershipService $organisations,
    ) {}

    /**
     * @return array{invitation: LearningGroupInvitation, invite_url: string, code: string}
     */
    public function issue(User $teacher, LearningGroup $group, ?string $email = null): array
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('manage', $group);

        $plainToken = Str::random(48);
        $plainCode = strtoupper(Str::random(8));

        $invitation = DB::transaction(function () use ($teacher, $group, $email, $plainToken, $plainCode) {
            $invitation = new LearningGroupInvitation;
            $invitation->forceFill([
                'learning_group_id' => $group->id,
                'invited_by_user_id' => $teacher->id,
                'invited_email' => $email !== null && $email !== '' ? strtolower(trim($email)) : null,
                'token_hash' => $this->hash($plainToken),
                'code_hash' => $this->hash($plainCode),
                'status' => LearningGroupInvitationStatus::Pending,
                'expires_at' => now()->addDays(self::TTL_DAYS),
            ])->save();

            return $invitation;
        });

        return [
            'invitation' => $invitation,
            'invite_url' => route('onboarding.connections', ['class_invite' => $plainToken]),
            'code' => $plainCode,
        ];
    }

    public function revoke(User $teacher, LearningGroupInvitation $invitation): LearningGroupInvitation
    {
        TeacherFeatures::abortUnlessEnabled();
        $invitation->loadMissing('learningGroup');
        abort_unless($invitation->learningGroup instanceof LearningGroup, 404);
        Gate::forUser($teacher)->authorize('manage', $invitation->learningGroup);

        $invitation->forceFill([
            'status' => LearningGroupInvitationStatus::Revoked,
            'revoked_at' => now(),
            'revoked_by_user_id' => $teacher->id,
        ])->save();

        return $invitation->refresh();
    }

    /**
     * Redeem a class invite into a pending student membership. Never skips consent.
     *
     * Short classroom codes stay reusable until expiry/revoke. Personal invite
     * URLs (token) and email-targeted invites are single-use.
     */
    /**
     * Resolve an invite for confirmation UI. Does not create or change memberships.
     *
     * @return array{
     *     class_name: string,
     *     organisation_name: string|null,
     *     organisation_type: string|null,
     *     independent: bool,
     *     already_joined: bool,
     *     membership_status: string|null,
     * }
     */
    public function preview(User $student, string $tokenOrCode): array
    {
        TeacherFeatures::abortUnlessEnabled();

        $invitation = $this->resolveOpenInvitation($tokenOrCode, $student);
        $group = $invitation->learningGroup;
        abort_unless($group instanceof LearningGroup, 404);

        $organisation = $group->organisation;
        $membership = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $student->id)
            ->where('membership_role', MembershipRole::Student->value)
            ->first();

        $alreadyJoined = $membership !== null
            && $membership->status === MembershipStatus::Approved;

        return [
            'class_name' => (string) $group->name,
            'organisation_name' => $organisation?->name !== null ? (string) $organisation->name : null,
            'organisation_type' => $organisation?->type !== null
                ? ($organisation->type instanceof \BackedEnum ? $organisation->type->value : (string) $organisation->type)
                : null,
            'independent' => $organisation === null,
            'already_joined' => $alreadyJoined,
            'membership_status' => $membership?->status?->value ?? ($membership ? (string) $membership->status : null),
        ];
    }

    public function redeem(User $student, string $tokenOrCode): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();

        $trimmed = $this->normalizeInviteInput($tokenOrCode);
        $invitation = $this->resolveOpenInvitation($trimmed, $student);

        $matchedByToken = hash_equals((string) $invitation->token_hash, $this->hash($trimmed));
        $consumeInvite = $matchedByToken || $invitation->invited_email !== null;

        $invitation->loadMissing('learningGroup.organisation');
        $group = $invitation->learningGroup;
        abort_unless($group instanceof LearningGroup, 404);

        return DB::transaction(function () use ($student, $invitation, $group, $consumeInvite) {
            $this->roles->grant($student, AccountRole::Student);

            if ($group->organisation !== null) {
                $this->organisations->activateFromClassInvite(
                    $student->refresh(),
                    $group->organisation,
                );
            }

            $membership = GroupMembership::query()
                ->where('learning_group_id', $group->id)
                ->where('user_id', $student->id)
                ->lockForUpdate()
                ->first();

            if ($membership && $membership->membership_role !== MembershipRole::Student) {
                throw ValidationException::withMessages([
                    'code' => __('ui.connections_invite_invalid'),
                ]);
            }

            if ($membership !== null && $membership->status === MembershipStatus::Approved) {
                throw ValidationException::withMessages([
                    'code' => __('ui.connections_already_joined'),
                ]);
            }

            if ($membership === null) {
                $membership = new GroupMembership;
            }

            if ($membership->status !== MembershipStatus::Approved) {
                $membership->forceFill([
                    'learning_group_id' => $group->id,
                    'user_id' => $student->id,
                    'membership_role' => MembershipRole::Student->value,
                    'status' => MembershipStatus::Pending->value,
                    'decided_by' => null,
                    'decided_at' => null,
                    'analytics_consent_status' => AnalyticsConsentStatus::None->value,
                    'analytics_consent_at' => null,
                    'analytics_consent_version' => null,
                    'analytics_consent_user_id' => null,
                ])->save();
            }

            if ($consumeInvite) {
                $invitation->forceFill([
                    'status' => LearningGroupInvitationStatus::Accepted,
                    'accepted_at' => now(),
                    'accepted_by_user_id' => $student->id,
                    'group_membership_id' => $membership->id,
                ])->save();
            }

            return $membership->refresh();
        });
    }

    /**
     * Accept raw codes, tokens, or pasted onboarding invite URLs.
     */
    public function normalizeInviteInput(string $raw): string
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return $trimmed;
        }

        if (preg_match('/(?:[?&]class_invite=)([^&\s#]+)/i', $trimmed, $matches) === 1) {
            return rawurldecode($matches[1]);
        }

        return $trimmed;
    }

    private function resolveOpenInvitation(string $tokenOrCode, ?User $student = null): LearningGroupInvitation
    {
        $trimmed = $this->normalizeInviteInput($tokenOrCode);
        $hash = $this->hash(strtoupper($trimmed));
        $altHash = $this->hash($trimmed);

        $invitation = LearningGroupInvitation::query()
            ->with('learningGroup.organisation')
            ->where(function ($query) use ($hash, $altHash) {
                $query->where('token_hash', $altHash)
                    ->orWhere('code_hash', $hash)
                    ->orWhere('code_hash', $altHash);
            })
            ->latest('id')
            ->first();

        if ($invitation === null || ! $invitation->isOpen()) {
            if ($invitation !== null && $invitation->status === LearningGroupInvitationStatus::Pending) {
                $invitation->forceFill(['status' => LearningGroupInvitationStatus::Expired])->save();
            }

            throw ValidationException::withMessages([
                'code' => __('ui.connections_invite_invalid'),
            ]);
        }

        if ($student instanceof User
            && $invitation->invited_email !== null
            && strcasecmp($invitation->invited_email, (string) $student->email) !== 0) {
            throw ValidationException::withMessages([
                'code' => __('ui.connections_invite_invalid'),
            ]);
        }

        return $invitation;
    }

    private function hash(string $value): string
    {
        return hash('sha256', $value);
    }
}
