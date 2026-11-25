<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherAttendanceRecord;
use App\Models\User;
use App\Services\Parent\ParentNoticeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
        $this->enableTeacherFeatures();
    }

    public function test_inbox_lists_notices_with_child_attribution_and_read_state(): void
    {
        [$teacher, $studentA, $studentB, $parent] = $this->familyWithTwoChildren();
        $recipientA = $this->recipient($teacher, $studentA);
        $recipientB = $this->recipient($teacher, $studentB);

        app(ParentNoticeService::class)->homework($studentA, (int) $recipientA->id);
        app(ParentNoticeService::class)->homework($studentB, (int) $recipientB->id);
        app(ParentNoticeService::class)->homework($studentA, (int) $recipientA->id);

        $payload = $this->actingAs($parent)
            ->getJson(route('api.parent.notifications.index'))
            ->assertOk()
            ->json();

        $this->assertSame(2, count($payload['notifications'] ?? []));
        $this->assertSame(2, (int) ($payload['unread_count'] ?? 0));
        $names = collect($payload['notifications'])->pluck('child_name')->filter()->unique()->values()->all();
        $this->assertContains('Student Alpha', $names);
        $this->assertContains('Student Beta', $names);
        $this->assertStringNotContainsString('Student Alpha', ($payload['notifications'][0]['title'] ?? '').($payload['notifications'][0]['body'] ?? ''));

        $firstId = (string) ($payload['notifications'][0]['id'] ?? '');
        $this->actingAs($parent)
            ->postJson(route('api.parent.notifications.read', $firstId))
            ->assertOk();

        $afterRead = $this->actingAs($parent)
            ->getJson(route('api.parent.notifications.index'))
            ->assertOk()
            ->json();
        $this->assertSame(1, (int) ($afterRead['unread_count'] ?? 0));
    }

    public function test_preferences_block_delivery_and_invalid_links_sanitized(): void
    {
        [$teacher, $student, , $parent] = $this->familyWithTwoChildren();
        $link = ParentStudentLink::query()
            ->where('parent_user_id', $parent->id)
            ->where('student_user_id', $student->id)
            ->firstOrFail();
        $recipient = $this->recipient($teacher, $student);

        app(ParentNoticeService::class)->homework($student, (int) $recipient->id);

        $link->forceFill(['permissions' => [ParentGuardianPermission::ViewProgress->value]])->save();

        $row = $this->actingAs($parent)
            ->getJson(route('api.parent.notifications.index'))
            ->assertOk()
            ->json('notifications.0');

        $this->assertFalse($row['href_valid']);
        $this->assertSame('/parent', $row['href']);

        $this->actingAs($parent)
            ->putJson(route('api.parent.notification-preferences.update'), ['homework' => false])
            ->assertOk();

        $blockedRecipient = $this->recipient($teacher, $student);
        app(ParentNoticeService::class)->homework($student, (int) $blockedRecipient->id);
        $this->assertSame(1, count($this->actingAs($parent)->getJson(route('api.parent.notifications.index'))->json('notifications')));
    }

    public function test_attendance_exception_and_overdue_respect_deadlines_toggle(): void
    {
        [$teacher, $student, , $parent, $group] = $this->familyWithTwoChildren();

        $record = new TeacherAttendanceRecord;
        $record->forceFill([
            'teacher_id' => $teacher->id,
            'learning_group_id' => $group->id,
            'student_id' => $student->id,
            'attendance_date' => today()->toDateString(),
            'status' => 'absent',
        ])->save();

        app(ParentNoticeService::class)->attendanceException($student, $record->fresh());

        $this->actingAs($parent)
            ->putJson(route('api.parent.notification-preferences.update'), ['attendance' => false])
            ->assertOk();

        $recordLate = $record->replicate();
        $recordLate->forceFill(['status' => 'late', 'attendance_date' => today()->subDay()->toDateString()])->save();
        app(ParentNoticeService::class)->attendanceException($student, $recordLate);

        $types = collect($this->actingAs($parent)->getJson(route('api.parent.notifications.index'))->json('notifications'))
            ->pluck('type')
            ->all();
        $this->assertContains('parent_attendance', $types);
        $this->assertCount(1, array_filter($types, fn (string $type) => $type === 'parent_attendance'));

        $overdueAssignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'due_at' => now()->subDay(),
        ]);
        $overdueRecipient = TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $overdueAssignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::InProgress->value,
        ]);
        unset($overdueRecipient);

        app(ParentNoticeService::class)->overdueHomework();
        $types = collect($this->actingAs($parent)->getJson(route('api.parent.notifications.index'))->json('notifications'))
            ->pluck('type')
            ->all();
        $this->assertContains('parent_overdue', $types);
    }

    public function test_mark_all_read_clears_parent_unread(): void
    {
        [$teacher, $student, , $parent] = $this->familyWithTwoChildren();
        $recipient = $this->recipient($teacher, $student);
        app(ParentNoticeService::class)->homework($student, (int) $recipient->id);
        app(ParentNoticeService::class)->deadline($student, 'parent-deadline:test:'.today()->toDateString());

        $this->actingAs($parent)
            ->postJson(route('api.parent.notifications.read-all'))
            ->assertOk()
            ->assertJsonPath('marked', 2);

        $this->actingAs($parent)
            ->getJson(route('api.parent.notifications.index'))
            ->assertOk()
            ->assertJsonPath('unread_count', 0);
    }

    /**
     * @return array{0: User, 1: User, 2: User, 3: User, 4: LearningGroup}
     */
    private function familyWithTwoChildren(): array
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $studentA = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Student Alpha',
        ]);
        $studentB = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Student Beta',
        ]);
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'Guardian',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);

        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $teacher->id,
            'membership_role' => MembershipRole::Teacher->value,
            'status' => MembershipStatus::Approved->value,
        ]);
        foreach ([$studentA, $studentB] as $student) {
            GroupMembership::factory()->create([
                'learning_group_id' => $group->id,
                'user_id' => $student->id,
                'membership_role' => MembershipRole::Student->value,
                'status' => MembershipStatus::Approved->value,
                'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
                'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
                'analytics_consent_user_id' => $student->id,
            ]);
        }

        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $studentA->id,
        ]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $studentB->id,
        ]);

        return [$teacher, $studentA, $studentB, $parent, $group];
    }

    private function recipient(User $teacher, User $student): TeacherAssignmentRecipient
    {
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'due_at' => now()->addDay(),
        ]);

        return TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending->value,
        ]);
    }
}