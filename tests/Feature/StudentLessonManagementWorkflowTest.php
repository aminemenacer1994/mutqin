<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Enums\ParentGuardianPermission;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherAttendanceRecord;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentLessonManagementWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
    }

    public function test_cancelled_task_preserves_submission_history_and_blocks_student_actions(): void
    {
        [$teacher, , , $student, $group] = $this->classroom();
        $assignment = $this->assignment($teacher, $student, $group, 'tajweed', 'sabaq');
        $recipient = $assignment->recipients()->firstOrFail();
        UserSession::query()->create([
            'user_id' => $student->id,
            'teacher_assignment_recipient_id' => $recipient->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'completed',
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'ended_at' => now(),
        ]);
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $recipient))->assertOk();
        $recipient->refresh();
        $submissionCount = count($recipient->completion_evidence['submissions'] ?? []);
        $this->assertGreaterThan(0, $submissionCount);

        $cancelled = $this->actingAs($teacher)
            ->postJson(route('api.teacher.assignment-recipients.cancel', $recipient), ['note' => 'Class moved online.'])
            ->assertOk()
            ->json('recipient');

        $this->assertSame(AssignmentStatus::Cancelled->value, $cancelled['status']);
        $this->assertSame('cancelled', $cancelled['display_status']);
        $this->assertSame('cancelled', $cancelled['assignment_state']);
        $this->assertCount($submissionCount, $cancelled['completion_evidence']['submissions']);

        $this->actingAs($student)->postJson(route('api.me.assignments.start', $recipient))->assertStatus(422);
    }

    public function test_reassign_creates_linked_replacement_without_corrupting_history(): void
    {
        [$teacher, , , $student, $group] = $this->classroom();
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'permissions' => [ParentGuardianPermission::ViewAssignments->value],
        ]);

        $assignment = $this->assignment($teacher, $student, $group, 'revision', 'manzil');
        $recipient = $assignment->recipients()->firstOrFail();

        $result = $this->actingAs($teacher)
            ->postJson(route('api.teacher.assignment-recipients.reassign', $recipient), [
                'due_at' => now()->addDays(3)->toDateString(),
            ])
            ->assertCreated()
            ->json();

        $this->assertSame(AssignmentStatus::Cancelled->value, $result['previous']['status']);
        $this->assertSame('reassigned', $result['previous']['display_status']);
        $newRecipient = $result['recipients'][0];
        $this->assertSame(AssignmentStatus::Pending->value, $newRecipient['status']);
        $this->assertSame((int) $recipient->id, $newRecipient['lifecycle']['predecessor_recipient_id']);

        $studentRows = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json('assignments');
        $this->assertNotNull(collect($studentRows)->firstWhere('id', $recipient->id));
        $this->assertNotNull(collect($studentRows)->firstWhere('id', $newRecipient['id']));

        $parentRow = collect(
            $this->actingAs($parent)->getJson(route('api.parent.children.assignments', $student))->assertOk()->json('assignments'),
        )->firstWhere('id', $newRecipient['id']);
        $this->assertSame('pending', $parentRow['display_status']);
    }

    public function test_duplicate_assignment_supports_scheduling_and_learning_categories(): void
    {
        [$teacher, , , $student, $group] = $this->classroom();
        foreach (['nazra', 'hifz', 'tajweed', 'revision'] as $activity) {
            $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
                'kind' => 'practice',
                'hifz_category' => 'sabaq',
                'activity' => $activity,
                'student_id' => $student->id,
                'surah_number' => 1,
                'ayah_start' => 1,
                'ayah_end' => 3,
                'due_at' => today()->addDays(5)->toDateString(),
            ])->assertCreated()->json('assignment');
            $this->assertSame($activity, $created['activity']);
        }

        $source = TeacherAssignment::query()
            ->where('teacher_id', $teacher->id)
            ->where('activity', 'nazra')
            ->latest('id')
            ->firstOrFail();

        $duplicate = $this->actingAs($teacher)
            ->postJson(route('api.teacher.assignments.duplicate', $source), [
                'student_id' => $student->id,
                'due_at' => today()->addWeek()->toDateString(),
                'allow_duplicate' => true,
            ])
            ->assertCreated()
            ->json();

        $this->assertNotSame((int) $source->id, (int) $duplicate['assignment']['id']);
        $this->assertSame('nazra', $duplicate['assignment']['activity']);
    }

    public function test_parent_attendance_requires_permission_and_matches_teacher_records(): void
    {
        [$teacher, , , $student, $group] = $this->classroom();
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'permissions' => [ParentGuardianPermission::ViewAttendance->value],
        ]);
        $record = new TeacherAttendanceRecord;
        $record->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'learning_group_id' => $group->id,
            'attendance_date' => today()->toDateString(),
            'status' => 'present',
            'notes' => null,
        ])->save();

        $payload = $this->actingAs($parent)
            ->getJson(route('api.parent.children.attendance', $student))
            ->assertOk()
            ->json();

        $this->assertSame(1, $payload['counts']['present']);
        $this->assertSame('present', $payload['history'][0]['status']);
        $this->assertTrue($payload['read_only']);
    }

    public function test_full_assignment_lifecycle_stays_aligned_across_teacher_student_and_parent(): void
    {
        [$teacher, , , $student, $group] = $this->classroom();
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'permissions' => [ParentGuardianPermission::ViewAssignments->value],
        ]);

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'hifz_category' => 'sabaq',
            'activity' => 'nazra',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'due_at' => today()->addDay()->toDateString(),
        ])->assertCreated()->json();
        $recipientId = (int) $created['recipients'][0]['id'];
        $recipient = TeacherAssignmentRecipient::query()->findOrFail($recipientId);

        UserSession::query()->create([
            'user_id' => $student->id,
            'teacher_assignment_recipient_id' => $recipient->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'completed',
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'ended_at' => now(),
        ]);
        $this->actingAs($student)->postJson(route('api.me.assignments.complete', $recipient))->assertOk();

        $this->actingAs($teacher)->postJson(route('api.teacher.assignment-recipients.approve', $recipient))->assertOk();

        $studentRow = collect($this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json('assignments'))
            ->firstWhere('id', $recipientId);
        $parentRow = collect($this->actingAs($parent)->getJson(route('api.parent.children.assignments', $student))->assertOk()->json('assignments'))
            ->firstWhere('id', $recipientId);
        $this->assertSame('completed', $studentRow['assignment_state']);
        $this->assertSame($studentRow['display_status'], $parentRow['display_status']);
        $this->assertSame('approved', $studentRow['review_state']);
        $this->assertSame($studentRow['review_state'], $parentRow['review_state']);
    }

    /**
     * @return array{0: User, 1: User, 2: User, 3: User, 4: LearningGroup, 5: LearningGroup}
     */
    private function classroom(): array
    {
        $organisation = Organisation::factory()->create(['type' => OrganisationType::Halaqa->value]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $secondTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $removedTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        $secondGroup = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);

        $this->approve($group, $teacher, MembershipRole::Teacher);
        $this->approve($group, $student, MembershipRole::Student, consent: true);
        $this->approve($secondGroup, $secondTeacher, MembershipRole::Teacher);
        $this->approve($secondGroup, $student, MembershipRole::Student, consent: true);

        return [$teacher, $secondTeacher, $removedTeacher, $student, $group, $secondGroup];
    }

    private function approve(LearningGroup $group, User $user, MembershipRole $role, bool $consent = false): void
    {
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $user->id,
            'membership_role' => $role->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => $consent ? AnalyticsConsentStatus::Granted->value : AnalyticsConsentStatus::None->value,
            'analytics_consent_version' => $consent ? GroupMembership::ANALYTICS_CONSENT_VERSION : null,
            'analytics_consent_user_id' => $consent ? $user->id : null,
        ]);
    }

    private function assignment(User $teacher, User $student, LearningGroup $group, string $activity, ?string $category): TeacherAssignment
    {
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'learning_group_id' => $group->id,
            'kind' => AssignmentKind::Practice->value,
            'activity' => $activity,
            'hifz_category' => $category,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'repetition_target' => 1,
            'due_at' => now()->addDays(2),
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending->value,
        ]);

        return $assignment;
    }
}