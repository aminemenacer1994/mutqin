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
use App\Models\MemorisationPracticePlan;
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
use App\Support\Demo\DemoStudentVolume;
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

    private Carbon $demoAnchor;

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
        $anchor = now()->copy()->startOfDay();
        $joined = $anchor->copy()->subMonths(2)->setTime(9, 0);
        $this->demoAnchor = $anchor;
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

        $this->seedParentConversations();
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
        $anchor = $this->demoAnchor;
        $teacher = $this->primaryTeacher($definition['group']);
        $activity = PlatformDemoCatalog::activity($definition['number']);
        $scenario = ($definition['number'] - 1) % 5;
        $range = PlatformDemoCatalog::assignmentRange($definition['number'], $activity);
        $created = $anchor->copy()->subDays(24)->addHours(10 + ($definition['number'] % 5));

        [$status, $due, $started, $studentCompleted, $completed] = match ($scenario) {
            0 => [AssignmentStatus::Pending, $created->copy()->addDays(21), null, null, null],
            1 => [AssignmentStatus::InProgress, $created->copy()->addDays(14), $created->copy()->addDay(), null, null],
            2 => [AssignmentStatus::Pending, $created->copy()->subDays(3), null, null, null],
            3 => [AssignmentStatus::AwaitingConfirmation, $created->copy()->addDays(7), $created->copy()->addDay(), $created->copy()->addDays(2), null],
            default => [AssignmentStatus::Completed, $created->copy()->addDays(5), $created->copy()->addDay(), $created->copy()->addDays(3), $created->copy()->addDays(4)],
        };

        if ($scenario === 2) {
            $range = PlatformDemoCatalog::OVERDUE_RANGE;
        }

        [$assignment, $recipient] = $this->storeAssignment(
            $teacher,
            $student,
            $definition,
            $range,
            $activity,
            $status,
            $created,
            $due,
            $started,
            $studentCompleted,
            $completed,
            $scenario === 4 ? 'Reviewed in class. The range is ready to move on.' : null,
        );

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $this->organisation->id,
            'teacher_assignment_id' => $assignment->id,
            'kind' => TeacherNoteKind::Feedback,
            'body' => 'Synthetic demo feedback for '.$student->name.'. Keep working on '.$this->rangeLabel($range).' at a calm pace.',
            'created_at' => $created->copy()->addDays(2),
            'updated_at' => $created->copy()->addDays(2),
        ])->save();

        $historical = $this->seedHistoricalAssignments($teacher, $student, $definition, $anchor);

        if ($definition['number'] <= 12) {
            $this->seedLearningPlan($teacher, $student, $definition, $activity, $anchor, $assignment, $recipient, $due, $range, $historical);
        }

        if ($definition['number'] % 3 === 1) {
            $revisionRange = PlatformDemoCatalog::practiceRange($definition['number']);
            (new RevisionRecommendation)->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'organisation_id' => $this->organisation->id,
                'status' => RevisionRecommendationStatus::Pending,
                'activity' => 'revision',
                'surah_number' => $revisionRange['surah'],
                'ayah_start' => $revisionRange['from'],
                'ayah_end' => $revisionRange['to'],
                'due_on' => $anchor->copy()->addDays(4)->toDateString(),
                'instructions' => 'Synthetic revision suggestion for '.$this->rangeLabel($revisionRange).'.',
                'reason_code' => 'demo_weak_range',
                'reason' => 'Recent practice on this short surah was uneven.',
                'evidence' => ['source' => 'platform-demo', 'synthetic' => true],
                'source_key' => 'platform-demo:'.$definition['key'],
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();
        }

        if (in_array($activity, ['revision', 'hifz'], true) && $definition['number'] <= 10) {
            $this->seedMurajaahPlans($student, $definition, $range, $anchor);
        }

        $this->seedHistory($student, $definition, $range);
    }

    /**
     * @param  array{number: int, key: string, name: string, email: string, group: string, extra_group: ?string}  $definition
     * @return list<array{assignment: TeacherAssignment, due: Carbon}>
     */
    private function seedHistoricalAssignments(User $teacher, User $student, array $definition, Carbon $anchor): array
    {
        $rows = [];
        $activities = ['nazra', 'tajweed', 'hifz', 'revision'];
        $historyCount = DemoStudentVolume::MIN_LIST_ITEMS - 1;

        for ($index = 0; $index < $historyCount; $index++) {
            $range = $index === 0
                ? PlatformDemoCatalog::priorRange($definition['number'])
                : PlatformDemoCatalog::practiceRange($definition['number'] + $index);
            $activity = $activities[$index % count($activities)];
            $offset = 8 + ($index * 4);
            $created = $anchor->copy()->subDays($offset)->setTime(11 + ($index % 4), 0);
            $due = $anchor->copy()->subDays(max(1, $offset - 4))->setTime(17, 0);
            $completed = $anchor->copy()->subDays(max(1, $offset - 6))->setTime(18, 0);

            [$assignment] = $this->storeAssignment(
                $teacher,
                $student,
                $definition,
                $range,
                $activity,
                AssignmentStatus::Completed,
                $created,
                $due,
                $created->copy()->addDay(),
                $completed->copy()->subDay(),
                $completed,
            );

            $rows[] = ['assignment' => $assignment, 'due' => $due];
        }

        return $rows;
    }

    /**
     * @param  array{number: int, key: string, group: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     * @param  list<array{assignment: TeacherAssignment, due: Carbon}>  $historical
     */
    private function seedLearningPlan(
        User $teacher,
        User $student,
        array $definition,
        string $activity,
        Carbon $anchor,
        TeacherAssignment $currentAssignment,
        TeacherAssignmentRecipient $currentRecipient,
        Carbon $due,
        array $range,
        array $historical,
    ): void {
        $created = $currentAssignment->created_at ?? $anchor->copy()->subWeeks(3);
        $plan = new LearningPlan;
        $plan->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $this->organisation->id,
            'title' => 'Four-week '.$activity.' plan',
            'cadence' => $definition['number'] % 2 === 0 ? 'monthly' : 'weekly',
            'status' => LearningPlanStatus::Active,
            'starts_on' => $anchor->copy()->subWeeks(4)->toDateString(),
            'ends_on' => $anchor->copy()->addWeeks(2)->toDateString(),
            'student_goal' => 'Complete '.$this->rangeLabel($range).' and keep muraja\'ah on track.',
            'notes' => 'Synthetic learning plan for parent and teacher dashboards.',
            'created_at' => $created,
            'updated_at' => $created,
        ])->save();

        $pastAssignment = $historical[0]['assignment'] ?? null;
        $pastDue = $historical[0]['due'] ?? $anchor->copy()->subWeeks(3);
        $pastRange = $pastAssignment !== null
            ? ['surah' => (int) $pastAssignment->surah_number, 'from' => (int) $pastAssignment->ayah_start, 'to' => (int) $pastAssignment->ayah_end]
            : PlatformDemoCatalog::priorRange($definition['number']);

        (new LearningPlanItem)->forceFill([
            'learning_plan_id' => $plan->id,
            'sort_order' => 1,
            'origin' => 'assigned',
            'item_status' => 'released',
            'kind' => $pastAssignment?->kind->value ?? AssignmentKind::Practice->value,
            'activity' => $pastAssignment?->activity ?? 'nazra',
            'hifz_category' => $pastAssignment?->hifz_category ?? 'sabaq',
            'surah_number' => $pastRange['surah'],
            'ayah_start' => $pastRange['from'],
            'ayah_end' => $pastRange['to'],
            'repetition_target' => 1,
            'due_on' => $pastDue->toDateString(),
            'priority' => 'normal',
            'instructions' => 'Opening range for this plan cycle.',
            'teacher_assignment_id' => $pastAssignment?->id,
            'created_at' => $created,
            'updated_at' => $created,
        ])->save();

        $currentItem = new LearningPlanItem;
        $currentItem->forceFill([
            'learning_plan_id' => $plan->id,
            'sort_order' => 2,
            'origin' => 'assigned',
            'item_status' => 'released',
            'kind' => $currentAssignment->kind->value,
            'activity' => $currentAssignment->activity,
            'hifz_category' => $currentAssignment->hifz_category,
            'surah_number' => $range['surah'],
            'ayah_start' => $range['from'],
            'ayah_end' => $range['to'],
            'repetition_target' => $currentAssignment->repetition_target,
            'due_on' => $due->toDateString(),
            'priority' => 'normal',
            'instructions' => 'Current focus for '.$student->name.'.',
            'teacher_assignment_id' => $currentAssignment->id,
            'created_at' => $created,
            'updated_at' => $created,
        ])->save();

        $nextRange = PlatformDemoCatalog::practiceRange($definition['number'] + 1);
        (new LearningPlanItem)->forceFill([
            'learning_plan_id' => $plan->id,
            'sort_order' => 3,
            'origin' => 'assigned',
            'item_status' => 'planned',
            'kind' => $activity === 'nazra' ? AssignmentKind::Practice->value : AssignmentKind::AiRecite->value,
            'activity' => $activity,
            'hifz_category' => PlatformDemoCatalog::hifzCategory($activity),
            'surah_number' => $nextRange['surah'],
            'ayah_start' => $nextRange['from'],
            'ayah_end' => $nextRange['to'],
            'repetition_target' => $activity === 'hifz' ? 5 : 1,
            'due_on' => $anchor->copy()->addWeeks(2)->toDateString(),
            'priority' => 'normal',
            'instructions' => 'Next step after the current range is confirmed.',
            'created_at' => $created,
            'updated_at' => $created,
        ])->save();

        $currentAssignment->forceFill([
            'learning_plan_id' => $plan->id,
            'learning_plan_item_id' => $currentItem->id,
        ])->save();
        $currentRecipient->touch();
    }

    /**
     * @param  array{number: int, email: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function seedMurajaahPlans(User $student, array $definition, array $range, Carbon $anchor): void
    {
        for ($index = 0; $index < DemoStudentVolume::MIN_LIST_ITEMS; $index++) {
            $this->seedMurajaahPlan($student, $definition, PlatformDemoCatalog::practiceRange($definition['number'] + $index), $anchor, $index);
        }
    }

    private function seedMurajaahPlan(User $student, array $definition, array $range, Carbon $anchor, int $index = 0): void
    {
        $identified = $anchor->copy()->subDays(18 + ($index * 3))->setTime(19, 30);
        $assessment = new MemorisationAssessment;
        $assessment->forceFill([
            'user_id' => $student->id,
            'surah_number' => $range['surah'],
            'start_ayah' => $range['from'],
            'end_ayah' => $range['to'],
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'idempotency_key' => 'platform-demo-plan:'.$definition['email'].':'.$index,
            'surah_name' => QuranMetadata::name($range['surah']),
            'overall_accuracy' => 68 + (($definition['number'] + $index) % 5) * 4,
            'friendly_summary' => 'Muraja\'ah plan for '.$this->rangeLabel($range).'.',
            'created_at' => $identified,
            'updated_at' => $identified,
        ])->save();

        (new MemorisationPracticePlan)->forceFill([
            'user_id' => $student->id,
            'assessment_id' => $assessment->id,
            'title' => 'Revisit '.$this->rangeLabel($range),
            'explanation' => 'Synthetic muraja\'ah plan tied to recent practice.',
            'status' => MemorisationPracticePlan::STATUS_ACTIVE,
            'practice_scope' => MemorisationPracticePlan::SCOPE_FULL_RANGE,
            'surah_number' => $range['surah'],
            'start_ayah' => $range['from'],
            'end_ayah' => $range['to'],
            'recommended_review_at' => $anchor->copy()->addDays(2 + $index),
            'accepted_at' => $identified,
            'created_at' => $identified,
            'updated_at' => $identified,
        ])->save();
    }

    /**
     * @param  array{number: int, key: string, group: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     * @return array{0: TeacherAssignment, 1: TeacherAssignmentRecipient}
     */
    private function storeAssignment(
        User $teacher,
        User $student,
        array $definition,
        array $range,
        string $activity,
        AssignmentStatus $status,
        Carbon $created,
        Carbon $due,
        ?Carbon $started = null,
        ?Carbon $studentCompleted = null,
        ?Carbon $completed = null,
        ?string $feedback = null,
    ): array {
        $assignment = new TeacherAssignment;
        $assignment->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $this->organisation->id,
            'learning_group_id' => $this->groups[$definition['group']]->id,
            'kind' => $activity === 'nazra' ? AssignmentKind::Practice : AssignmentKind::AiRecite,
            'hifz_category' => PlatformDemoCatalog::hifzCategory($activity),
            'activity' => $activity,
            'recording_required' => false,
            'surah_number' => $range['surah'],
            'ayah_start' => $range['from'],
            'ayah_end' => $range['to'],
            'repetition_target' => $activity === 'hifz' ? 5 : 1,
            'due_at' => $due,
            'feedback' => $feedback,
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

        return [$assignment, $recipient];
    }

    private function seedParentConversations(): void
    {
        $threads = [
            ['parent' => 'p01', 'child' => 1, 'parent_body' => 'Salaam — how is Adam doing on the current Al-Fatiha range?', 'teacher_body' => 'He is steady. One more calm repetition at home this week would help.'],
            ['parent' => 'p01', 'child' => 2, 'parent_body' => 'Should Ayah practise the overdue task before the new one?', 'teacher_body' => 'Yes — finish the overdue nazra first, then move to the next ayahs.'],
            ['parent' => 'p03', 'child' => 6, 'parent_body' => 'Khadija asked about muraja\'ah at home. Any suggested rhythm?', 'teacher_body' => 'Ten quiet minutes after maghrib on the plan range is enough for now.'],
        ];

        foreach ($threads as $thread) {
            $parent = $this->parents[$thread['parent']];
            $student = $this->students[$thread['child']];
            $group = collect(PlatformDemoCatalog::students())->firstWhere('number', $thread['child'])['group'] ?? 'dawn';
            $teacher = $this->primaryTeacher($group);
            $at = $this->demoAnchor->copy()->subDays(4)->setTime(20, 15);

            (new TeacherNote)->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'parent_user_id' => $parent->id,
                'organisation_id' => $this->organisation->id,
                'kind' => TeacherNoteKind::ParentMessage,
                'body' => $thread['parent_body'],
                'created_at' => $at,
                'updated_at' => $at,
            ])->save();

            (new TeacherNote)->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'parent_user_id' => $parent->id,
                'organisation_id' => $this->organisation->id,
                'kind' => TeacherNoteKind::TeacherMessage,
                'body' => $thread['teacher_body'],
                'read_at' => $at->copy()->addHours(6),
                'created_at' => $at->copy()->addHours(5),
                'updated_at' => $at->copy()->addHours(6),
            ])->save();
        }
    }

    /**
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function rangeLabel(array $range): string
    {
        return QuranMetadata::name($range['surah']).' '.$range['from'].'–'.$range['to'];
    }

    /**
     * @param  array{number: int, email: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function seedHistory(User $student, array $definition, array $range): void
    {
        $historyStart = now()->copy()->startOfDay()->subWeeks(5);
        $ayahs = range($range['from'], $range['to']);
        foreach ($ayahs as $offset => $ayah) {
            $at = $historyStart->copy()->addDays($offset * 3)->setTime(17 + ($definition['number'] % 2), 0);
            $mastery = max(45, min(96, 58 + ($definition['number'] % 6) * 3 + $offset * 5));
            (new MemorisationProgress)->forceFill([
                'user_id' => $student->id,
                'surah_number' => $range['surah'],
                'ayah_number' => $ayah,
                'status' => $mastery >= 80 ? 'memorised' : 'learning',
                'mastery_level' => $mastery,
                'repetitions' => 2 + $offset,
                'completed_at' => $mastery >= 80 ? $at : null,
                'created_at' => $at,
                'updated_at' => $at,
            ])->save();
        }

        $sessions = $definition['number'] === 15 ? 1 : 4;
        for ($week = 0; $week < $sessions; $week++) {
            $at = $historyStart->copy()->addWeeks($week)->setTime(18 + ($definition['number'] % 3), 0);

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

        $at = now()->copy()->subDays(10 + ($definition['number'] % 6))->setTime(19, 0);
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
            $rows[] = ['Parent', $parent['name'], $parent['email'].' → '.PlatformDemoCatalog::parentChildrenNames($parent)];
        }
        $command->table(['Role', 'Name', 'Sign-in'], $rows);
        $command->line('Password: set MUTQIN_PLATFORM_DEMO_PASSWORD locally (see docs/TESTER_GUIDE.md). It is never printed here.');
        $command->line('Try Hana Yusuf (/teacher), Adam Nasser (/dashboard), Sara Qadir (/parent). Data dates are anchored to today so overdue, in-progress and recent practice show on every dashboard.');
        $command->line('Scenarios: every student has a teacher and an approved guardian. Students 1 and 15 have two guardians. Students 1, 2, 6 and 11 have two circles. Each student has current work, completed history, and most have a three-step learning plan. Parent threads exist for Sara Qadir and Amina Saleh. No audio files were created.');
    }
}
