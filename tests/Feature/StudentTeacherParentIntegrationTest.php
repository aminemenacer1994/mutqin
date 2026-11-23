<?php

namespace Tests\Feature;

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
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\LearningPlan;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\RevisionRecommendation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Models\UserSession;
use App\Notifications\LearningTaskNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTeacherParentIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
    }

    public function test_student_circle_follows_current_teachers_guardians_and_hides_private_records(): void
    {
        [$teacher, $secondTeacher, $removedTeacher, $student, $group, $secondGroup] = $this->classroom();
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'Amina Hassan',
            'email' => 'amina.private@example.test',
        ]);
        $revokedParent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'Revoked Guardian',
            'email' => 'revoked.private@example.test',
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'relationship' => 'mother',
        ]);
        ParentStudentLink::factory()->create([
            'parent_user_id' => $revokedParent->id,
            'student_user_id' => $student->id,
            'status' => ParentLinkStatus::Revoked->value,
            'relationship' => 'father',
        ]);

        $assignment = $this->assignment($teacher, $student, $group, 'hifz', 'sabaq');
        $assignment->recipients()->first()->forceFill([
            'status' => AssignmentStatus::AwaitingConfirmation->value,
            'student_completed_at' => now(),
        ])->save();
        $this->assignment($secondTeacher, $student, $secondGroup, 'tajweed', null);
        $this->assignment($removedTeacher, $student, $group, 'revision', 'manzil');

        TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'teacher_assignment_id' => $assignment->id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'Stretch the madd.',
        ]);
        TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'parent_user_id' => $parent->id,
            'kind' => TeacherNoteKind::ParentMessage->value,
            'body' => 'PARENT PRIVATE THREAD',
        ]);
        TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'body' => 'CONFIDENTIAL STAFF NOTE',
        ]);

        $plan = new LearningPlan;
        $plan->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'title' => 'Hifz week',
            'cadence' => 'weekly',
            'status' => LearningPlanStatus::Active->value,
            'starts_on' => now()->toDateString(),
            'notes' => 'TEACHER ONLY PLAN NOTE',
        ])->save();
        $removedPlan = new LearningPlan;
        $removedPlan->forceFill([
            'teacher_id' => $removedTeacher->id,
            'student_id' => $student->id,
            'organisation_id' => $removedTeacher->organisation_id,
            'title' => 'Old teacher plan',
            'cadence' => 'weekly',
            'status' => LearningPlanStatus::Active->value,
            'starts_on' => now()->toDateString(),
            'notes' => 'REMOVED TEACHER PLAN',
        ])->save();

        $published = new RevisionRecommendation;
        $published->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'status' => RevisionRecommendationStatus::Assigned->value,
            'activity' => 'revision',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'instructions' => 'Practise this page.',
            'reason_code' => 'teacher_assigned',
            'reason' => 'PUBLISHED TARGET',
            'source_key' => 'published-target',
            'assigned_at' => now(),
        ])->save();
        $pending = new RevisionRecommendation;
        $pending->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'status' => RevisionRecommendationStatus::Pending->value,
            'activity' => 'revision',
            'surah_number' => 2,
            'ayah_start' => 1,
            'ayah_end' => 5,
            'reason_code' => 'internal',
            'reason' => 'PRIVATE RECOMMENDATION',
            'source_key' => 'private-recommendation',
        ])->save();

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $payload = json_encode($support);

        $teacherIds = array_column($support['circle']['teachers'], 'id');
        $this->assertEqualsCanonicalizing([$teacher->id, $secondTeacher->id], $teacherIds);
        $this->assertNotContains($removedTeacher->id, $teacherIds);

        $hifzTeacher = collect($support['circle']['teachers'])->firstWhere('id', $teacher->id);
        $this->assertContains('Hifz circle', array_column($hifzTeacher['learning_areas'], 'label'));
        $this->assertContains('Hifz', array_column($hifzTeacher['learning_areas'], 'label'));
        $this->assertTrue($hifzTeacher['can_message']);

        $tajweedTeacher = collect($support['circle']['teachers'])->firstWhere('id', $secondTeacher->id);
        $this->assertContains('Tajweed', array_column($tajweedTeacher['learning_areas'], 'label'));

        $this->assertSame('Amina', $support['circle']['guardians'][0]['display_name']);
        $this->assertSame('mother', $support['circle']['guardians'][0]['relationship']);
        $this->assertFalse($support['circle']['guardians'][0]['name_hidden']);
        $this->assertCount(1, $support['circle']['guardians']);
        $this->assertSame('Hifz week', $support['circle']['learning_plans'][0]['title']);
        $this->assertArrayNotHasKey('notes', $support['circle']['learning_plans'][0]);
        $this->assertSame('Practise this page.', $support['circle']['revision_targets'][0]['instructions']);
        $this->assertStringNotContainsString('PRIVATE RECOMMENDATION', $payload);
        $this->assertStringNotContainsString('PARENT PRIVATE THREAD', $payload);
        $this->assertStringNotContainsString('CONFIDENTIAL STAFF NOTE', $payload);
        $this->assertStringNotContainsString('TEACHER ONLY PLAN NOTE', $payload);
        $this->assertStringNotContainsString('REMOVED TEACHER PLAN', $payload);
        $this->assertStringNotContainsString('Old teacher plan', $payload);
        $this->assertStringNotContainsString('amina.private@example.test', $payload);
        $this->assertStringNotContainsString('revoked.private@example.test', $payload);
        $this->assertStringNotContainsString('Amina Hassan', $payload);

        $submission = collect($support['learning']['submissions'])->firstWhere('recipient_id', $assignment->recipients()->value('id'));
        $this->assertSame('Stretch the madd.', $submission['teacher_feedback']['body'] ?? null);

        $this->actingAs($student)
            ->postJson(route('api.me.teachers.messages.store', $removedTeacher), ['body' => 'Are you still my teacher?'])
            ->assertNotFound();
        $this->actingAs($student)
            ->postJson(route('api.me.teachers.messages.store', $teacher), ['body' => 'I will practise.'])
            ->assertCreated();

        $this->assertNotNull($published->id);
        $this->assertNotNull($pending->id);
    }

    public function test_submission_review_and_parent_visibility_share_one_status(): void
    {
        [$teacher, , , $student, $group] = $this->classroom();
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value, 'name' => 'Linked Parent']);
        $limited = User::factory()->create(['account_role' => AccountRole::Parent->value, 'name' => 'Limited Parent']);
        $revoked = User::factory()->create(['account_role' => AccountRole::Parent->value, 'name' => 'Former Parent']);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $limited->id,
            'student_user_id' => $student->id,
            'permissions' => [ParentGuardianPermission::ViewProgress->value],
        ]);
        ParentStudentLink::factory()->create([
            'parent_user_id' => $revoked->id,
            'student_user_id' => $student->id,
            'status' => ParentLinkStatus::Revoked->value,
        ]);

        $assignment = $this->assignment($teacher, $student, $group, 'hifz', 'sabaq');
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

        $this->actingAs($student)
            ->postJson(route('api.me.assignments.complete', $recipient))
            ->assertOk();

        $studentRow = collect($this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json('assignments'))
            ->firstWhere('id', $recipient->id);
        $parentRow = collect($this->actingAs($parent)->getJson(route('api.parent.children.assignments', $student))->assertOk()->json('assignments'))
            ->firstWhere('id', $recipient->id);
        $this->assertSame(AssignmentStatus::AwaitingConfirmation->value, $studentRow['status']);
        $this->assertSame('submitted', $studentRow['review_state']);
        $this->assertSame($studentRow['status'], $parentRow['status']);
        $this->assertSame($studentRow['review_state'], $parentRow['review_state']);
        $this->assertSame('awaiting_confirmation', $parentRow['display_status']);

        $this->assertSame('Task submitted', $this->notice($teacher, 'student_submission')['title']);
        $this->assertSame('Homework submitted', $this->notice($parent, 'parent_learning_update')['title']);
        $this->assertNull($this->notice($limited, 'parent_learning_update'));
        $this->assertNull($this->notice($revoked, 'parent_learning_update'));

        $this->actingAs($limited)->getJson(route('api.parent.children.assignments', $student))->assertNotFound();
        $this->actingAs($revoked)->getJson(route('api.parent.children.assignments', $student))->assertNotFound();

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.assignment-recipients.correction', $recipient), ['note' => 'Repeat ayah two.'])
            ->assertOk();

        $studentRow = collect($this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json('assignments'))
            ->firstWhere('id', $recipient->id);
        $parentRow = collect($this->actingAs($parent)->getJson(route('api.parent.children.assignments', $student))->assertOk()->json('assignments'))
            ->firstWhere('id', $recipient->id);
        $this->assertSame('needs_correction', $studentRow['review_state']);
        $this->assertSame($studentRow['status'], $parentRow['status']);
        $this->assertSame('needs_correction', $parentRow['review_state']);
        $this->assertSame('needs_correction', $parentRow['display_status']);
        $this->assertSame('Correction requested', $this->notice($parent, 'parent_learning_update', 'Correction requested')['title']);
    }

    public function test_school_students_cannot_open_direct_messages_or_read_another_student(): void
    {
        $organisation = Organisation::factory()->create(['type' => OrganisationType::School->value]);
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'School Teacher',
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'School Student',
        ]);
        $other = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Other Student',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Year 4']);
        $this->approve($group, $teacher, MembershipRole::Teacher);
        $this->approve($group, $student, MembershipRole::Student, consent: true);
        $this->approve($group, $other, MembershipRole::Student, consent: true);
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'School Parent',
            'email' => 'school.parent@example.test',
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'relationship' => 'parent',
        ]);
        $assignment = $this->assignment($teacher, $student, $group, 'hifz', 'sabaq');
        $recipient = $assignment->recipients()->firstOrFail();

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $this->assertFalse($support['circle']['teachers'][0]['can_message']);
        $this->assertSame('age_safeguarding', $support['circle']['teachers'][0]['messaging_reason']);
        $this->assertNull($support['circle']['guardians'][0]['display_name']);
        $this->assertTrue($support['circle']['guardians'][0]['name_hidden']);
        $this->assertStringNotContainsString('school.parent@example.test', json_encode($support));

        $this->actingAs($student)
            ->postJson(route('api.me.teachers.messages.store', $teacher), ['body' => 'Can we talk?'])
            ->assertForbidden();
        $this->actingAs($other)
            ->getJson(route('api.me.assignments.messages.index', $recipient))
            ->assertForbidden();
        $this->actingAs($other)
            ->postJson(route('api.me.assignments.notes.store', $recipient), ['body' => 'Not my task'])
            ->assertNotFound();
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
            'name' => 'Hifz Teacher',
        ]);
        $secondTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Tajweed Teacher',
        ]);
        $removedTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Former Teacher',
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Circle Student',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Hifz circle']);
        $secondGroup = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Tajweed circle']);

        $this->approve($group, $teacher, MembershipRole::Teacher);
        $this->approve($group, $student, MembershipRole::Student, consent: true);
        $this->approve($secondGroup, $secondTeacher, MembershipRole::Teacher);
        $this->approve($secondGroup, $student, MembershipRole::Student, consent: true);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $removedTeacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Rejected->value,
        ]);

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
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending->value,
        ]);

        return $assignment;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function notice(User $user, string $type, ?string $title = null): ?array
    {
        $match = $user->fresh()->notifications
            ->first(function ($notification) use ($type, $title) {
                if ($notification->type !== LearningTaskNotification::class) {
                    return false;
                }
                $data = $notification->data;

                return ($data['type'] ?? null) === $type
                    && ($title === null || ($data['title'] ?? null) === $title);
            });

        return $match?->data;
    }
}
