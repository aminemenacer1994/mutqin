<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\TeacherAttendanceRecord;
use App\Models\User;
use App\Models\UserSession;
use App\Support\DatabaseDeploySafety;
use App\Support\Demo\OrganisationNetworkCatalog;
use App\Support\Demo\OrganisationNetworkClassroom;
use App\Support\Demo\TeacherDemoCatalog;
use Illuminate\Support\Collection;

/**
 * Enrol configured real-mailbox students into every demo teacher group (local/staging only).
 */
final class TeacherAnchorStudentEnroller
{
    private const PRIMARY_ANCHOR_EMAIL = 'menacer72@gmail.com';

    private const PRIMARY_ANCHOR_NAME = 'Amine Menacer';

    /**
     * @return list<string>
     */
    public function emails(): array
    {
        if (DatabaseDeploySafety::isProtectedEnvironment()) {
            return [];
        }

        $configured = config('mutqin.teacher_anchor_student_emails', []);

        return is_array($configured)
            ? array_values(array_filter(array_map(
                static fn (mixed $email): string => strtolower(trim((string) $email)),
                $configured,
            )))
            : [];
    }

    public function enrolAll(): void
    {
        DatabaseDeploySafety::assertNotProtectedEnvironment('enrol teacher anchor students');

        $emails = $this->emails();
        if ($emails === []) {
            return;
        }

        $groupIds = $this->demoTeacherGroupIds();
        if ($groupIds->isEmpty()) {
            return;
        }

        foreach ($emails as $email) {
            $this->enrolEmail($email, $groupIds);
        }
    }

    /**
     * @param  Collection<int, int>  $groupIds
     */
    private function enrolEmail(string $email, Collection $groupIds): void
    {
        $primaryGroup = LearningGroup::query()->find($groupIds->first());
        if ($primaryGroup === null) {
            return;
        }

        $joined = now()->subDays(30);
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first() ?? new User;
        // A configured mailbox may now be the demo teacher. Never convert an
        // existing teacher (or another real account) into a student here.
        if ($user->exists && $user->account_role !== AccountRole::Student) {
            return;
        }
        $attributes = [
            'name' => $email === self::PRIMARY_ANCHOR_EMAIL
                ? self::PRIMARY_ANCHOR_NAME
                : ($user->exists ? $user->name : 'Demo Student'),
            'email' => $email,
            'email_verified_at' => $user->email_verified_at ?? $joined,
            'password_set_at' => $user->password_set_at ?? $joined,
            'locale' => $user->locale ?? 'en',
            'theme' => $user->theme ?? 'sepia-mode',
            'subscription_tier' => $user->subscription_tier ?? 'free',
            'subscription_plan' => $user->subscription_plan ?? 'free',
            'subscription_status' => $user->subscription_status ?? 'free',
            'account_role' => AccountRole::Student,
            'organisation_id' => $primaryGroup->organisation_id,
        ];

        if (! $user->exists) {
            $attributes['password'] = TeacherDemoCatalog::PASSWORD;
        }

        $user->forceFill($attributes)->save();

        foreach ($groupIds as $groupId) {
            $this->ensureStudentMembership($user, (int) $groupId);
        }

        $this->seedAttendance($user, $groupIds);
        $this->seedLearningActivity($user, $groupIds);
    }

    /** @param Collection<int, int> $groupIds */
    private function seedLearningActivity(User $student, Collection $groupIds): void
    {
        if (UserSession::query()->where('user_id', $student->id)->exists()) {
            return;
        }

        $teacherMembership = GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('user')
            ->get()
            ->first(function (GroupMembership $membership): bool {
                $marker = (string) $membership->user?->stripe_customer_id;

                return str_starts_with($marker, TeacherDemoCatalog::MARKER)
                    || str_starts_with($marker, OrganisationNetworkCatalog::MARKER);
            });

        if ($teacherMembership?->user === null) {
            return;
        }

        app(OrganisationNetworkClassroom::class)->plantStudent(
            $student,
            $teacherMembership->user,
            [
                'key' => 'anchor-amine-menacer',
                'name' => $student->name,
                'email' => $student->email,
                'number' => 17,
                'profile' => 'good',
                'ordinal' => 1,
            ],
        );
    }

    private function ensureStudentMembership(User $user, int $groupId): void
    {
        $at = now()->subDays(14);
        $membership = GroupMembership::query()
            ->where('learning_group_id', $groupId)
            ->where('user_id', $user->id)
            ->first() ?? new GroupMembership;

        $membership->forceFill([
            'learning_group_id' => $groupId,
            'user_id' => $user->id,
            'membership_role' => MembershipRole::Student,
            'status' => MembershipStatus::Approved,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted,
            'analytics_consent_at' => $at,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $user->id,
            'created_at' => $membership->exists ? $membership->created_at : $at,
            'updated_at' => $at,
        ])->save();
    }

    /** @param Collection<int, int> $groupIds */
    private function seedAttendance(User $student, Collection $groupIds): void
    {
        $teacherMemberships = GroupMembership::query()
            ->whereIn('learning_group_id', $groupIds)
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->with('user:id,stripe_customer_id')
            ->get()
            ->filter(function (GroupMembership $membership): bool {
                $marker = (string) $membership->user?->stripe_customer_id;

                return str_starts_with($marker, TeacherDemoCatalog::MARKER)
                    || str_starts_with($marker, OrganisationNetworkCatalog::MARKER);
            });

        $statuses = [
            0 => 'present', 1 => 'present', 2 => 'late', 3 => 'present', 4 => 'absent',
            7 => 'present', 8 => 'present', 9 => 'late', 10 => 'present', 11 => 'absent',
        ];
        foreach ($teacherMemberships as $membership) {
            foreach ($statuses as $daysAgo => $status) {
                $date = now()->subDays($daysAgo)->toDateString();
                $record = TeacherAttendanceRecord::query()
                    ->where('teacher_id', $membership->user_id)
                    ->where('learning_group_id', $membership->learning_group_id)
                    ->where('student_id', $student->id)
                    ->whereDate('attendance_date', $date)
                    ->first() ?? new TeacherAttendanceRecord;
                $record->forceFill([
                    'teacher_id' => $membership->user_id,
                    'learning_group_id' => $membership->learning_group_id,
                    'student_id' => $student->id,
                    'attendance_date' => $date,
                    'status' => $status,
                ])->save();
            }
        }
    }

    /**
     * @return Collection<int, int>
     */
    private function demoTeacherGroupIds(): Collection
    {
        return GroupMembership::query()
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->whereHas('user', function ($query) {
                $query->where('account_role', AccountRole::Teacher->value)
                    ->where(function ($inner) {
                        $inner->where('stripe_customer_id', 'like', TeacherDemoCatalog::MARKER.'%')
                            ->orWhere('stripe_customer_id', 'like', OrganisationNetworkCatalog::MARKER.'%');
                    });
            })
            ->pluck('learning_group_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }
}
