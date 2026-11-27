<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentLinkStatus;
use App\Enums\StudentProgressReportStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\ParentStudentLink;
use App\Models\StudentProgressReport;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StudentProgressReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
        Carbon::setTestNow('2026-11-20 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_teacher_can_draft_approve_and_share_an_immutable_report(): void
    {
        [$teacher, $student] = $this->classroom();
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'hifz_category' => 'sabaq',
            'activity' => 'hifz',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'created_at' => '2026-11-10 10:00:00',
            'due_at' => '2026-11-12 10:00:00',
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Completed->value,
        ]);

        $draft = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.progress-reports.store', $student), [
                'period_type' => 'custom',
                'from' => '2026-11-01',
                'to' => '2026-11-19',
            ])
            ->assertCreated()
            ->json('report');

        $this->assertSame('draft', $draft['status']);
        $this->assertSame(1, (int) ($draft['payload']['categories']['sabaq']['completed'] ?? 0));
        $this->assertArrayHasKey('provenance', $draft['payload']);

        $draftId = (int) $draft['id'];
        $this->actingAs($teacher)
            ->patchJson(route('api.teacher.progress-reports.update', $draftId), [
                'teacher_notes' => 'Strong week on Al-Fatiha.',
            ])
            ->assertOk()
            ->assertJsonPath('report.teacher_notes', 'Strong week on Al-Fatiha.');

        $frozenPayload = $draft['payload'];
        $approved = $this->actingAs($teacher)
            ->postJson(route('api.teacher.progress-reports.approve', $draftId), [
                'share_with_parents' => true,
            ])
            ->assertOk()
            ->json('report');

        $this->assertSame('approved', $approved['status']);
        $this->assertTrue($approved['immutable']);
        $this->assertNotNull($approved['approved_at']);
        $this->assertNull(StudentProgressReport::query()->find($draftId));

        TeacherAssignmentRecipient::query()->first()?->forceFill(['status' => AssignmentStatus::Pending->value])->save();
        $shown = $this->actingAs($teacher)
            ->getJson(route('api.teacher.progress-reports.show', $approved['id']))
            ->assertOk()
            ->json('report');
        $this->assertSame(
            (int) ($frozenPayload['categories']['sabaq']['completed'] ?? 0),
            (int) ($shown['payload']['categories']['sabaq']['completed'] ?? -1),
        );

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.progress-reports.approve', $approved['id']))
            ->assertStatus(422);
    }

    public function test_draft_refresh_recomputes_payload(): void
    {
        [$teacher, $student] = $this->classroom();

        $draft = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.progress-reports.store', $student), [
                'period_type' => 'custom',
                'from' => '2026-11-01',
                'to' => '2026-11-19',
            ])
            ->assertCreated()
            ->json('report');

        $before = (int) ($draft['payload']['summary']['tasks_assigned'] ?? 0);
        $late = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'created_at' => now()->subDays(3),
            'due_at' => now()->subDay(),
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $late->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending->value,
        ]);

        $refreshed = $this->actingAs($teacher)
            ->postJson(route('api.teacher.progress-reports.refresh', $draft['id']))
            ->assertOk()
            ->json('report');

        $this->assertGreaterThanOrEqual($before + 1, (int) ($refreshed['payload']['summary']['tasks_assigned'] ?? 0));
    }

    public function test_parent_sees_only_shared_approved_reports_and_pdf(): void
    {
        [$teacher, $student, $parent] = $this->linkedFamily();

        $draft = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.progress-reports.store', $student), [
                'period_type' => 'custom',
                'from' => '2026-11-01',
                'to' => '2026-11-19',
            ])
            ->assertCreated()
            ->json('report');

        $this->actingAs($parent)
            ->getJson(route('api.parent.progress-reports.index', ['child_id' => $student->id]))
            ->assertOk()
            ->assertJsonPath('reports', []);

        $this->actingAs($parent)
            ->getJson(route('api.parent.progress-reports.show', $draft['id']))
            ->assertNotFound();

        $approved = $this->actingAs($teacher)
            ->postJson(route('api.teacher.progress-reports.approve', $draft['id']), [
                'share_with_parents' => true,
            ])
            ->assertOk()
            ->json('report');

        $this->actingAs($parent)
            ->getJson(route('api.parent.progress-reports.index', ['child_id' => $student->id]))
            ->assertOk()
            ->assertJsonPath('reports.0.id', $approved['id'])
            ->assertJsonPath('reports.0.kind', 'teacher_approved');

        $download = $this->actingAs($parent)
            ->get(route('api.parent.progress-reports.download', $approved['id']))
            ->assertOk();
        $this->assertSame('application/pdf', $download->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $download->getContent());
    }

    public function test_foreign_teacher_cannot_access_report(): void
    {
        [$teacher, $student] = $this->classroom();
        $other = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);

        $draft = $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.progress-reports.store', $student), [
                'period_type' => 'week',
            ])
            ->assertCreated()
            ->json('report');

        $this->actingAs($other)
            ->getJson(route('api.teacher.progress-reports.show', $draft['id']))
            ->assertNotFound();
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function classroom(): array
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        OrganisationMembership::query()->create([
            'user_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
            'is_institution_admin' => true,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $student->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $student->id,
        ]);

        return [$teacher, $student];
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function linkedFamily(): array
    {
        [$teacher, $student] = $this->classroom();
        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        ParentStudentLink::factory()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
            'status' => ParentLinkStatus::Approved->value,
        ]);

        return [$teacher, $student, $parent];
    }
}