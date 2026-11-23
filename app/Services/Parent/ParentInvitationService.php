<?php

namespace App\Services\Parent;

use App\Enums\ParentInvitationStatus;
use App\Enums\ParentLinkStatus;
use App\Models\ParentInvitation;
use App\Models\ParentInvitationEvent;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\ParentFeatures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ParentInvitationService
{
    public const TTL_DAYS = 7;

    public function __construct(
        private readonly StudentAccessAuthorizer $students,
        private readonly ParentStudentLinkService $links,
    ) {}

    /**
     * @return array{invitation: ParentInvitation, invite_url: string}
     */
    public function invite(User $teacher, User $student, string $email, ?string $relationship, ?Request $request = null): array
    {
        ParentFeatures::abortUnlessEnabled();
        $this->assertTeacherCanInvite($teacher, $student);

        $email = $this->normalizeEmail($email);
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['email' => __('parent.invite_email_invalid')]);
        }
        if (strcasecmp($email, (string) $student->email) === 0 || (int) $teacher->id === (int) $student->id) {
            throw ValidationException::withMessages(['email' => __('parent.invite_email_invalid')]);
        }

        $existingParent = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existingParent !== null) {
            $approved = ParentStudentLink::query()
                ->where('parent_user_id', $existingParent->id)
                ->where('student_user_id', $student->id)
                ->where('status', ParentLinkStatus::Approved->value)
                ->exists();
            if ($approved) {
                throw ValidationException::withMessages(['email' => __('parent.invite_already_linked')]);
            }
        }

        $open = ParentInvitation::query()
            ->where('student_user_id', $student->id)
            ->where('invited_email', $email)
            ->where('status', ParentInvitationStatus::Pending->value)
            ->latest('id')
            ->first();
        if ($open !== null && $open->expires_at->isFuture()) {
            throw ValidationException::withMessages(['email' => __('parent.invite_already_pending')]);
        }

        $plain = Str::random(48);

        $invitation = DB::transaction(function () use ($teacher, $student, $email, $relationship, $plain, $request) {
            $invitation = new ParentInvitation;
            $invitation->forceFill([
                'student_user_id' => $student->id,
                'invited_email' => $email,
                'relationship' => $relationship,
                'invited_by_user_id' => $teacher->id,
                'token_hash' => $this->hash($plain),
                'status' => ParentInvitationStatus::Pending,
                'expires_at' => now()->addDays(self::TTL_DAYS),
                'sent_at' => now(),
            ])->save();

            $this->event($invitation, 'invited', $teacher, $request);

            return $invitation;
        });

        return [
            'invitation' => $invitation,
            'invite_url' => route('parent.invitation.show', ['token' => $plain]),
        ];
    }

    /**
     * @return array{invitation: ParentInvitation, invite_url: string}
     */
    public function resend(User $teacher, ParentInvitation $invitation, ?Request $request = null): array
    {
        ParentFeatures::abortUnlessEnabled();
        $invitation->loadMissing('student');
        $student = $invitation->student;
        abort_unless($student instanceof User, 404);
        $this->assertTeacherCanInvite($teacher, $student);
        $this->expireIfNeeded($invitation);

        if (! in_array($invitation->status, [ParentInvitationStatus::Pending, ParentInvitationStatus::Expired], true)) {
            throw ValidationException::withMessages(['invitation' => __('parent.invite_not_resendable')]);
        }

        $plain = Str::random(48);
        $invitation->forceFill([
            'token_hash' => $this->hash($plain),
            'status' => ParentInvitationStatus::Pending,
            'expires_at' => now()->addDays(self::TTL_DAYS),
            'sent_at' => now(),
            'revoked_at' => null,
            'revoked_by_user_id' => null,
        ])->save();
        $this->event($invitation, 'resent', $teacher, $request);

        return [
            'invitation' => $invitation->refresh(),
            'invite_url' => route('parent.invitation.show', ['token' => $plain]),
        ];
    }

    public function revoke(User $teacher, ParentInvitation $invitation, ?Request $request = null): ParentInvitation
    {
        ParentFeatures::abortUnlessEnabled();
        $invitation->loadMissing('student');
        $student = $invitation->student;
        abort_unless($student instanceof User, 404);
        $this->assertTeacherCanInvite($teacher, $student);

        if (in_array($invitation->status, [ParentInvitationStatus::Rejected, ParentInvitationStatus::Revoked], true)) {
            return $invitation;
        }

        return DB::transaction(function () use ($teacher, $invitation, $request) {
            $invitation->forceFill([
                'status' => ParentInvitationStatus::Revoked,
                'revoked_at' => now(),
                'revoked_by_user_id' => $teacher->id,
                'token_hash' => $this->hash(Str::random(48)),
            ])->save();
            $this->event($invitation, 'revoked', $teacher, $request);

            if ($invitation->parent_student_link_id !== null) {
                $link = ParentStudentLink::query()->find($invitation->parent_student_link_id);
                if ($link !== null && $link->status === ParentLinkStatus::Approved) {
                    $this->links->revoke($link, $teacher, 'invitation_revoked', $request);
                }
            }

            return $invitation->refresh();
        });
    }

    public function revokeLink(User $teacher, User $student, ParentStudentLink $link, ?Request $request = null): ParentStudentLink
    {
        ParentFeatures::abortUnlessEnabled();
        $this->assertTeacherCanInvite($teacher, $student);
        abort_unless((int) $link->student_user_id === (int) $student->id, 404);

        return $this->links->revoke($link, $teacher, 'teacher_revoked', $request);
    }

    /**
     * @return array{status: string, child?: array{id: int, name: string}}
     */
    public function accept(User $parent, string $plainToken, ?Request $request = null): array
    {
        ParentFeatures::abortUnlessEnabled();
        $invitation = $this->findByToken($plainToken);
        if ($invitation === null) {
            throw ValidationException::withMessages(['token' => __('parent.invite_invalid')]);
        }

        $this->expireIfNeeded($invitation);
        if ($invitation->status === ParentInvitationStatus::Expired) {
            throw ValidationException::withMessages(['token' => __('parent.invite_expired')]);
        }
        if ($invitation->status !== ParentInvitationStatus::Pending) {
            throw ValidationException::withMessages(['token' => __('parent.invite_invalid')]);
        }
        if (strcasecmp((string) $parent->email, $invitation->invited_email) !== 0) {
            throw ValidationException::withMessages(['token' => __('parent.invite_wrong_account')]);
        }

        $student = $invitation->student;
        abort_unless($student instanceof User, 404);

        $link = $this->links->request($parent, $student, $invitation->invitedBy, $invitation->relationship, null, $request);
        $link = $this->links->approve($link, $parent, null, $request);

        $invitation->forceFill([
            'status' => ParentInvitationStatus::Accepted,
            'accepted_at' => now(),
            'accepted_by_user_id' => $parent->id,
            'parent_student_link_id' => $link->id,
            'token_hash' => $this->hash(Str::random(48)),
        ])->save();
        $this->event($invitation, 'accepted', $parent, $request);

        return [
            'status' => ParentInvitationStatus::Accepted->value,
            'child' => [
                'id' => (int) $student->id,
                'name' => $student->name,
            ],
        ];
    }

    public function reject(User $parent, string $plainToken, ?Request $request = null): void
    {
        ParentFeatures::abortUnlessEnabled();
        $invitation = $this->findByToken($plainToken);
        if ($invitation === null || ! $invitation->isOpen()) {
            throw ValidationException::withMessages(['token' => __('parent.invite_invalid')]);
        }
        if (strcasecmp((string) $parent->email, $invitation->invited_email) !== 0) {
            throw ValidationException::withMessages(['token' => __('parent.invite_wrong_account')]);
        }

        $invitation->forceFill([
            'status' => ParentInvitationStatus::Rejected,
            'rejected_at' => now(),
            'token_hash' => $this->hash(Str::random(48)),
        ])->save();
        $this->event($invitation, 'rejected', $parent, $request);
    }

    /**
     * @return array{invitations: list<array<string, mixed>>, guardians: list<array<string, mixed>>}
     */
    public function listForTeacher(User $teacher, User $student): array
    {
        ParentFeatures::abortUnlessEnabled();
        $this->assertTeacherCanInvite($teacher, $student);

        ParentInvitation::query()
            ->where('student_user_id', $student->id)
            ->where('status', ParentInvitationStatus::Pending->value)
            ->where('expires_at', '<=', now())
            ->update([
                'status' => ParentInvitationStatus::Expired->value,
                'updated_at' => now(),
            ]);

        $invitations = ParentInvitation::query()
            ->where('student_user_id', $student->id)
            ->latest('id')
            ->get()
            ->map(fn (ParentInvitation $invitation) => $this->presentInvitation($invitation));

        $links = ParentStudentLink::query()
            ->where('student_user_id', $student->id)
            ->with('parent:id,name,email')
            ->get()
            ->map(function (ParentStudentLink $link) {
                $status = $link->status === ParentLinkStatus::Approved ? 'accepted' : $link->status?->value;

                return [
                    'kind' => 'link',
                    'id' => (int) $link->id,
                    'email' => $link->parent?->email,
                    'name' => $link->parent?->name,
                    'status' => $status,
                    'relationship' => $link->relationship,
                    'approved_at' => $link->approved_at?->toIso8601String(),
                    'revoked_at' => $link->revoked_at?->toIso8601String(),
                ];
            });

        return [
            'invitations' => $invitations->values()->all(),
            'guardians' => $links->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function presentInvitation(ParentInvitation $invitation): array
    {
        return [
            'kind' => 'invitation',
            'id' => (int) $invitation->id,
            'email' => $invitation->invited_email,
            'status' => $invitation->status?->value,
            'relationship' => $invitation->relationship,
            'expires_at' => $invitation->expires_at?->toIso8601String(),
            'sent_at' => $invitation->sent_at?->toIso8601String(),
            'accepted_at' => $invitation->accepted_at?->toIso8601String(),
            'revoked_at' => $invitation->revoked_at?->toIso8601String(),
        ];
    }

    private function findByToken(string $plain): ?ParentInvitation
    {
        $plain = trim($plain);
        if ($plain === '') {
            return null;
        }

        return ParentInvitation::query()->where('token_hash', $this->hash($plain))->first();
    }

    private function expireIfNeeded(ParentInvitation $invitation): void
    {
        if ($invitation->status === ParentInvitationStatus::Pending && $invitation->expires_at->isPast()) {
            $invitation->forceFill(['status' => ParentInvitationStatus::Expired])->save();
        }
    }

    private function assertTeacherCanInvite(User $teacher, User $student): void
    {
        abort_unless($teacher->isTeacher() && $this->students->allows($teacher, $student), 404);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function hash(string $value): string
    {
        return hash('sha256', $value);
    }

    private function event(ParentInvitation $invitation, string $event, ?User $actor, ?Request $request): void
    {
        ParentInvitationEvent::query()->create([
            'parent_invitation_id' => $invitation->id,
            'actor_user_id' => $actor?->id,
            'event' => $event,
            'metadata' => null,
            'ip_address' => $request?->ip(),
            'created_at' => now(),
        ]);
    }
}
