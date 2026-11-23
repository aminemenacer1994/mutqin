<?php

namespace Database\Seeders;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\LearningPlanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Enums\RevisionRecommendationStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningPlan;
use App\Models\LearningPlanItem;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\ParentStudentLinkEvent;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Auth\UserRoleService;
use App\Services\Memorisation\RecitationScoringThresholds;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Teacher\TeacherAssignmentService;
use App\Support\Demo\PlatformDemoCatalog;
use App\Support\QuranMetadata;
use App\Support\Registration\OrganisationName;
use App\Support\TeacherFeatures;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Development-only teacher, student and parent classroom.
 *
 * Seed: php artisan mutqin:seed-platform-demo
 *
 * Requires MUTQIN_PLATFORM_DEMO_PASSWORD. Refuses production. Replaces only
 * accounts that already carry the platform-demo ownership marker.
 */
class PlatformDemoSeeder extends Seeder
{
    use GuardsDemoSeeding;

    private Organisation $organisation;

    /** @var array<string, LearningGroup> */
    private array $groups = [];

    /** @var array<string, User> */
    private array $teachers = [];

    /** @var array<int, User> */
    private array $students = [];

    /** @var array<string, User> */
    private array $parents = [];

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();
        foreach (PlatformDemoCatalog::emails() as $email) {
            $this->assertSafeDemoEmail($email);
        }

        $password = (string) config('mutqin.platform_demo_password');
        if (strlen($password) < 8) {
            throw new RuntimeException(
                'Set MUTQIN_PLATFORM_DEMO_PASSWORD to at least 8 characters before seeding. The password is not stored in source and is not printed.'
            );
        }

        DB::transaction(function () use ($password): void {
            $this->purgeOwned();
            $this->plant($password);
        });

        if (TeacherFeatures::enabled()) {
            $assignments = app(TeacherAssignmentService::class);
            $access = app(StudentAccessAuthorizer::class);
            foreach ($this->teachers as $teacher) {
                $assignments->refreshStatuses($teacher, $access->authorizedStudentIds($teacher)->all());
            }
        }

        $this->report();
    }

    private function purgeOwned(): void
    {
        $users = User::withTrashed()->whereIn('email', PlatformDemoCatalog::emails())->get();
        foreach ($users as $user) {
            if ($user->stripe_customer_id !== PlatformDemoCatalog::markerFor((string) $user->email)) {
                throw new RuntimeException('Refusing to overwrite '.$user->email.' because it is not a platform-demo account.');
            }
            $user->forceDelete();
        }

        $organisation = Organisation::query()
            ->where('name_canonical', OrganisationName::canonical(PlatformDemoCatalog::ORGANISATION))
            ->first();
        if ($organisation !== null && $organisation->users()->exists()) {
            throw new RuntimeException('Refusing to replace '.PlatformDemoCatalog::ORGANISATION.' because other accounts still belong to it.');
        }
        $organisation?->delete();
    }

    private function plant(string $password): void
    {
        $joined = Carbon::parse('2026-09-01 09:00:00');
        $this->organisation = new Organisation;
        $this->organisation->forceFill([
            'type' => OrganisationType::Halaqa,
            'name' => OrganisationName::display(PlatformDemoCatalog::ORGANISATION),
            'name_canonical' => OrganisationName::canonical(PlatformDemoCatalog::ORGANISATION),
            'created_at' => $joined,
            'updated_at' => $joined,
        ])->save();

        foreach (PlatformDemoCatalog::groups() as $definition) {
            $group = new LearningGroup;
            $group->forceFill([
                'organisation_id' => $this->organisation->id,
                'name' => $definition['name'],
                'name_canonical' => OrganisationName::canonical($definition['name']),
                'created_at' => $joined,
                'updated_at' => $joined,
            ])->save();
            $this->groups[$definition['key']] = $group;
        }

        foreach (PlatformDemoCatalog::teachers() as $definition) {
            $teacher = $this->makeUser($definition['name'], $definition['email'], AccountRole::Teacher, $password, $joined);
            $this->teachers[$definition['key']] = $teacher;
        }

        foreach (PlatformDemoCatalog::groups() as $definition) {
            foreach ($definition['teachers'] as $teacherKey) {
                $this->membership($this->teachers[$teacherKey], $this->groups[$definition['key']], MembershipRole::Teacher, false, $joined);
            }
        }

        foreach (PlatformDemoCatalog::students() as $definition) {
            $student = $this->makeUser($definition['name'], $definition['email'], AccountRole::Student, $password, $joined->copy()->addDays($definition['number']));
            $this->students[$definition['number']] = $student;
            $this->membership($student, $this->groups[$definition['group']], MembershipRole::Student, true, $joined);
            if ($definition['extra_group'] !== null) {
                $this->membership($student, $this->groups[$definition['extra_group']], MembershipRole::Student, true, $joined);
            }
            $this->seedLearning($student, $definition);
        }

        foreach (PlatformDemoCatalog::parents() as $definition) {
            $parent = $this->makeUser($definition['name'], $definition['email'], AccountRole::Parent, $password, $joined);
            $this->parents[$definition['key']] = $parent;
            foreach ($definition['children'] as $number) {
                $this->guardianLink($parent, $this->students[$number]);
            }
        }
    }

    private function makeUser(string $name, string $email, AccountRole $role, string $password, Carbon $joined): User
    {
        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'email_verified_at' => $joined,
            'password_set_at' => $joined,
            'locale' => 'en',
            'theme' => 'light',
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
            'subscription_status' => 'free',
            'is_admin' => false,
            'account_role' => $role,
            'organisation_id' => $role === AccountRole::Parent ? null : $this->organisation->id,
            'stripe_customer_id' => PlatformDemoCatalog::markerFor($email),
            'created_at' => $joined,
            'updated_at' => $joined,
        ])->save();

        app(UserRoleService::class)->grant($user, $role);

        return $user->fresh();
    }

    private function membership(User $user, LearningGroup $group, MembershipRole $role, bool $consent, Carbon $at): void
    {
        $membership = new GroupMembership;
        $membership->forceFill([
            'learning_group_id' => $group->id,
            'user_id' => $user->id,
            'membership_role' => $role,
            'status' => MembershipStatus::Approved,
            'decided_at' => $at,
            'analytics_consent_status' => $consent ? AnalyticsConsentStatus::Granted : AnalyticsConsentStatus::None,
            'analytics_consent_at' => $consent ? $at : null,
            'analytics_consent_version' => $consent ? GroupMembership::ANALYTICS_CONSENT_VERSION : null,
            'analytics_consent_user_id' => $consent ? $user->id : null,
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
    }

    /**
     * @param  array{number: int, key: string, name: string, email: string, group: string, extra_group: ?string}  $definition
     */
    private function seedLearning(User $student, array $definition): void
    {
        $teacher = $this->primaryTeacher($definition['group']);
        $activities = ['nazra', 'hifz', 'tajweed', 'revision'];
        $activity = $activities[($definition['number'] - 1) % 4];
        $scenario = ($definition['number'] - 1) % 5;
        $range = ['surah' => 1, 'from' => 1, 'to' => min(7, 1 + ($definition['number'] % 4))];
        $created = Carbon::parse('2026-10-01 10:00:00')->addDays($definition['number']);

        [$status, $due, $started, $studentCompleted, $completed] = match ($scenario) {
            0 => [AssignmentStatus::Pending, $created->copy()->addDays(21), null, null, null],
            1 => [AssignmentStatus::InProgress, $created->copy()->addDays(14), $created->copy()->addDay(), null, null],
            2 => [AssignmentStatus::Pending, $created->copy()->subDays(3), null, null, null],
            3 => [AssignmentStatus::AwaitingConfirmation, $created->copy()->addDays(7), $created->copy()->addDay(), $created->copy()->addDays(2), null],
            default => [AssignmentStatus::Completed, $created->copy()->addDays(5), $created->copy()->addDay(), $created->copy()->addDays(3), $created->copy()->addDays(4)],
        };

        $assignment = new TeacherAssignment;
        $assignment->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $this->organisation->id,
            'learning_group_id' => $this->groups[$definition['group']]->id,
            'kind' => $activity === 'nazra' ? AssignmentKind::Practice : AssignmentKind::AiRecite,
            'hifz_category' => $activity === 'revision' ? 'manzil' : 'sabaq',
            'activity' => $activity,
            'recording_required' => false,
            'surah_number' => $range['surah'],
            'ayah_start' => $range['from'],
            'ayah_end' => $range['to'],
            'repetition_target' => $activity === 'hifz' ? 5 : 1,
            'due_at' => $due,
            'feedback' => $scenario === 4 ? 'Reviewed in class. The range is ready to move on.' : null,
            'priority' => 'normal',
            'created_at' => $created,
            'updated_at' => $created,
        ])->save();

        $recipient = new TeacherAssignmentRecipient;
        $recipient->forceFill([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => $status,
            'started_at' => $started,
            'student_completed_at' => $studentCompleted,
            'completed_at' => $completed,
            'created_at' => $created,
            'updated_at' => $completed ?? $studentCompleted ?? $started ?? $created,
        ])->save();

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $this->organisation->id,
            'teacher_assignment_id' => $assignment->id,
            'kind' => TeacherNoteKind::Feedback,
            'body' => 'Synthetic demo feedback for '.$student->name.'. Keep the same short range and repeat it calmly.',
            'created_at' => $created->copy()->addDays(2),
            'updated_at' => $created->copy()->addDays(2),
        ])->save();

        if ($definition['number'] <= 5) {
            $plan = new LearningPlan;
            $plan->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'organisation_id' => $this->organisation->id,
                'title' => 'Four-week '.$activity.' target',
                'cadence' => 'weekly',
                'status' => LearningPlanStatus::Active,
                'starts_on' => '2026-10-06',
                'ends_on' => '2026-11-02',
                'student_goal' => 'Finish Al-Fatiha with a steady revision habit.',
                'notes' => 'Demo learning target. No live classroom data.',
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();

            (new LearningPlanItem)->forceFill([
                'learning_plan_id' => $plan->id,
                'sort_order' => 1,
                'origin' => 'assigned',
                'item_status' => 'released',
                'kind' => $assignment->kind->value,
                'hifz_category' => $assignment->hifz_category,
                'surah_number' => $range['surah'],
                'ayah_start' => $range['from'],
                'ayah_end' => $range['to'],
                'repetition_target' => $assignment->repetition_target,
                'due_on' => $due->toDateString(),
                'priority' => 'normal',
                'instructions' => 'Synthetic target for the demo classroom.',
                'teacher_assignment_id' => $assignment->id,
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();

            $assignment->forceFill(['learning_plan_id' => $plan->id])->save();
        }

        if ($definition['number'] % 3 === 1) {
            (new RevisionRecommendation)->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'organisation_id' => $this->organisation->id,
                'status' => RevisionRecommendationStatus::Pending,
                'activity' => 'revision',
                'surah_number' => 112,
                'ayah_start' => 1,
                'ayah_end' => 4,
                'due_on' => '2026-11-20',
                'instructions' => 'Synthetic revision suggestion.',
                'reason_code' => 'demo_weak_range',
                'reason' => 'Recent practice on this short surah was uneven.',
                'evidence' => ['source' => 'platform-demo', 'synthetic' => true],
                'source_key' => 'platform-demo:'.$definition['key'],
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();
        }

        $this->seedHistory($student, $definition, $range);
    }

    /**
     * @param  array{number: int, email: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function seedHistory(User $student, array $definition, array $range): void
    {
        $sessions = $definition['number'] === 15 ? 1 : 4;
        for ($week = 0; $week < $sessions; $week++) {
            $at = Carbon::parse('2026-10-06 18:00:00')->addWeeks($week)->addHours($definition['number'] % 3);
            $mastery = max(40, min(96, 55 + ($definition['number'] % 7) * 4 + $week * 6));
            (new MemorisationProgress)->forceFill([
                'user_id' => $student->id,
                'surah_number' => $range['surah'],
                'ayah_number' => $week + 1,
                'status' => $mastery >= 80 ? 'memorised' : 'learning',
                'mastery_level' => $mastery,
                'repetitions' => 2 + $week,
                'completed_at' => $mastery >= 80 ? $at : null,
                'created_at' => $at,
                'updated_at' => $at,
            ])->save();

            $session = new UserSession;
            $session->forceFill([
                'user_id' => $student->id,
                'surah_number' => $range['surah'],
                'ayah_number' => $range['from'],
                'current_step' => 4,
                'memorisation_mode' => 'advanced',
                'status' => UserSessionStatus::Completed,
                'is_onboarding_example' => false,
                'repetitions_completed' => 3,
                'session_duration_seconds' => 600 + ($week * 40),
                'last_activity_at' => $at,
                'started_at' => $at->copy()->subMinutes(12),
                'ended_at' => $at,
                'attempt_number' => $week + 1,
                'start_idempotency_key' => 'platform-demo:'.$definition['email'].':session:'.$week,
                'metadata' => ['synthetic' => true, 'range_end' => $range['to']],
                'created_at' => $at,
                'updated_at' => $at,
            ])->save();
        }

        if ($definition['number'] > 8) {
            return;
        }

        $at = Carbon::parse('2026-10-20 19:00:00')->addDays($definition['number']);
        $accuracy = 62 + (($definition['number'] * 5) % 31);
        $assessment = new MemorisationAssessment;
        $assessment->forceFill([
            'user_id' => $student->id,
            'surah_number' => $range['surah'],
            'start_ayah' => $range['from'],
            'end_ayah' => $range['to'],
            'assessment_type' => MemorisationAssessment::TYPE_DASHBOARD_AI_RECITE,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'idempotency_key' => 'platform-demo:'.$definition['email'].':assessment',
            'surah_name' => QuranMetadata::name($range['surah']),
            'overall_accuracy' => $accuracy,
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();

        (new AiReciteAttempt)->forceFill([
            'user_id' => $student->id,
            'memorisation_assessment_id' => $assessment->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => 1,
            'accuracy_percent' => $accuracy,
            'band' => RecitationScoringThresholds::bandForAccuracy($accuracy),
            'peek_used' => false,
            'duration_ms' => 18000,
            'ayah_range' => [
                'surah' => $range['surah'],
                'from' => $range['from'],
                'to' => $range['to'],
            ],
            'word_statuses' => [],
            'audio_disk' => null,
            'audio_path' => null,
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
    }

    private function guardianLink(User $parent, User $student): void
    {
        $link = new ParentStudentLink;
        $link->forceFill([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'status' => ParentLinkStatus::Approved,
            'relationship' => 'guardian',
            'permissions' => ParentGuardianPermission::defaultGranted(),
            'requested_by_user_id' => $parent->id,
            'decided_by_user_id' => $student->id,
            'decided_at' => now(),
            'approved_at' => now(),
        ])->save();

        ParentStudentLinkEvent::query()->create([
            'parent_student_link_id' => $link->id,
            'actor_user_id' => $student->id,
            'event' => 'approved',
            'metadata' => ['source' => 'platform-demo-seeder', 'synthetic' => true],
            'created_at' => now(),
        ]);
    }

    private function primaryTeacher(string $groupKey): User
    {
        $group = collect(PlatformDemoCatalog::groups())->firstWhere('key', $groupKey);

        return $this->teachers[$group['teachers'][0]];
    }

    private function report(): void
    {
        $command = $this->command;
        if ($command === null) {
            return;
        }

        $command->info('Platform demo ready. Password is MUTQIN_PLATFORM_DEMO_PASSWORD and is not printed.');
        $rows = [];
        foreach (PlatformDemoCatalog::teachers() as $teacher) {
            $rows[] = ['Teacher', $teacher['name'], $teacher['email']];
        }
        foreach (PlatformDemoCatalog::students() as $student) {
            $rows[] = ['Student', $student['name'], $student['email']];
        }
        foreach (PlatformDemoCatalog::parents() as $parent) {
            $rows[] = ['Parent', $parent['name'], $parent['email'].' (children '.implode(', ', $parent['children']).')'];
        }
        $command->table(['Role', 'Name', 'Email'], $rows);
        $command->line('Scenarios: every student has a teacher and an approved guardian. Students 1 and 15 have two guardians. Students 1, 2, 6 and 11 have two circles. Assignments cover nazra, hifz, tajweed and revision, including upcoming, in progress, date-overdue, submitted and completed work.');
        $command->line('No audio files were created.');
    }
}
