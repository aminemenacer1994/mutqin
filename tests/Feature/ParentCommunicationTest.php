<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Enums\TeacherNoteKind;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\ParentStudentLinkEvent;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Notifications\LearningTaskNotification;
use App\Services\Learning\LearningTaskNotifier;
use App\Services\Parent\ParentNoticeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ParentCommunicationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
        $this->enableTeacherFeatures();
    }

    public function test_linked_parent_messages_the_teacher_without_entering_the_student_thread(): void
    {
        [$teacher, $student, $parent] = $this->classroom();
        $body = 'Please check the revision privately';

        $this->actingAs($parent)
            ->postJson(route('api.parent.messages.store', [$teacher, $student]), ['body' => $body])
            ->assertCreated()
            ->assertJsonPath('message.sender', 'parent')
            ->assertJsonPath('message.child_name', 'Classroom Student')
            ->assertJsonPath('message.state', 'sent');

        $this->assertDatabaseHas('teacher_notes', [
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'parent_user_id' => $parent->id,
            'kind' => TeacherNoteKind::ParentMessage->value,
        ]);
        $this->assertDatabaseHas('parent_student_link_events', [
            'actor_user_id' => $parent->id,
            'event' => 'message_sent',
        ]);

        $studentThread = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.messages', $student))
            ->assertOk();
        $this->assertStringNotContainsString($body, $studentThread->getContent());

        $inbox = $this->actingAs($parent)
            ->getJson(route('api.parent.messages.index'))
            ->assertOk()
            ->json('conversations');
        $this->assertSame($teacher->id, $inbox[0]['teacher_id']);
        $this->assertSame('Classroom Student', $inbox[0]['child_name']);

        $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.guardian-messages', ['student' => $student, 'parent' => $parent->id]))
            ->assertOk()
            ->assertJsonPath('messages.0.state', 'read')
            ->assertJsonPath('messages.0.parent_name', $parent->name)
            ->assertJsonPath('messages.0.child_name', 'Classroom Student');

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.students.guardian-messages.store', $student), [
                'parent_id' => $parent->id,
                'body' => 'I will review it this week',
            ])
            ->assertCreated()
            ->assertJsonPath('message.sender', 'teacher');

        $parentThread = $this->actingAs($parent)
            ->getJson(route('api.parent.messages.show', [$teacher, $student]))
            ->assertOk();
        $this->assertCount(2, $parentThread->json('messages'));
        $this->assertSame('read', $parentThread->json('messages.0.state'));

        $teacherNotice = $this->notice($teacher, 'New parent message');
        $parentNotice = $this->notice($parent, 'New teacher message');
        $this->assertStringNotContainsString('Classroom Student', $teacherNotice['title'].$teacherNotice['body']);
        $this->assertStringNotContainsString('Classroom Student', $parentNotice['title'].$parentNotice['body']);
        $this->assertStringNotContainsString($body, $teacherNotice['title'].$teacherNotice['body']);
    }

    public function test_relationship_changes_block_parent_teacher_contact(): void
    {
        [$teacher, $student, $parent, $link] = $this->classroom();
        $outsider = User::factory()->create(['account_role' => AccountRole::Parent->value, 'name' => 'Outside Parent']);
        $otherTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
            'name' => 'Other Teacher',
        ]);

        $this->actingAs($outsider)
            ->postJson(route('api.parent.messages.store', [$teacher, $student]), ['body' => 'Hello'])
            ->assertNotFound();
        $this->actingAs($parent)
            ->postJson(route('api.parent.messages.store', [$otherTeacher, $student]), ['body' => 'Hello'])
            ->assertNotFound();

        $link->forceFill(['permissions' => [ParentGuardianPermission::ViewProgress->value]])->save();
        $this->actingAs($parent)
            ->postJson(route('api.parent.messages.store', [$teacher, $student]), ['body' => 'Hello'])
            ->assertNotFound();

        $link->forceFill([
            'permissions' => ParentGuardianPermission::defaultGranted(),
            'status' => ParentLinkStatus::Revoked->value,
        ])->save();
        $this->actingAs($parent)
            ->getJson(route('api.parent.messages.show', [$teacher, $student]))
            ->assertNotFound();

        [$teacher, $student, $parent] = $this->classroom();
        GroupMembership::query()->where('user_id', $teacher->id)->delete();
        $this->actingAs($parent)
            ->postJson(route('api.parent.messages.store', [$teacher, $student]), ['body' => 'Hello'])
            ->assertNotFound();
        $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.guardian-messages', $student))
            ->assertNotFound();
    }

    public function test_notification_preferences_control_delivery_without_child_details(): void
    {
        [$teacher, $student, $parent] = $this->classroom();
        $this->actingAs($parent)
            ->putJson(route('api.parent.notification-preferences.update'), [
                'homework' => false,
                'deadlines' => false,
                'feedback' => false,
                'messages' => false,
                'updates' => false,
                'weekly_summary' => false,
            ])
            ->assertOk()
            ->assertJsonPath('preferences.homework', false)
            ->assertJsonPath('preferences.weekly_summary', false);

        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'activity' => 'nazra',
            'due_at' => now()->addDay(),
        ]);
        $recipient = TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending->value,
        ]);

        $assignment->load('recipients');
        app(LearningTaskNotifier::class)->assignmentPublished($assignment);
        $this->assertSame([], $this->notices($parent));

        $this->actingAs($parent)
            ->putJson(route('api.parent.notification-preferences.update'), [
                'homework' => true,
                'deadlines' => true,
            ])
            ->assertOk();

        app(ParentNoticeService::class)->homework($student, (int) $recipient->id);
        Artisan::call('mutqin:notify-parent-deadlines');

        $homework = $this->notice($parent, 'New homework');
        $deadline = $this->notice($parent, 'Homework deadline');
        $this->assertStringNotContainsString('Classroom Student', $homework['title'].$homework['body']);
        $this->assertStringNotContainsString('Classroom Student', $deadline['title'].$deadline['body']);

        Artisan::call('mutqin:notify-parent-deadlines');
        $this->assertCount(1, array_filter(
            $this->notices($parent),
            fn (array $notice) => ($notice['title'] ?? '') === 'Homework deadline',
        ));
    }

    public function test_reports_are_audited_and_weekly_summary_uses_existing_progress(): void
    {
        [$teacher, $student, $parent] = $this->classroom();
        $created = $this->actingAs($parent)
            ->postJson(route('api.parent.messages.store', [$teacher, $student]), ['body' => 'A private question'])
            ->assertCreated();

        $this->actingAs($parent)
            ->postJson(route('api.parent.messages.report', $created->json('message.id')), [
                'reason' => 'Please review this message',
            ])
            ->assertOk()
            ->assertJsonPath('message.reported', true);

        $event = ParentStudentLinkEvent::query()->where('event', 'message_reported')->first();
        $this->assertNotNull($event);
        $this->assertSame('Please review this message', $event->metadata['reason']);
        $this->assertArrayNotHasKey('body', $event->metadata ?? []);

        $report = $this->notice($teacher, 'Message reported');
        $this->assertStringNotContainsString('Classroom Student', $report['title'].$report['body']);
        $this->assertStringNotContainsString('A private question', $report['title'].$report['body']);

        $this->actingAs($parent)
            ->putJson(route('api.parent.notification-preferences.update'), ['weekly_summary' => true])
            ->assertOk();
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => TeacherAssignment::factory()->create([
                'teacher_id' => $teacher->id,
                'organisation_id' => $teacher->organisation_id,
            ])->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Completed->value,
        ]);

        Artisan::call('mutqin:notify-parent-weekly-summaries');
        $summary = $this->notice($parent, 'Weekly progress summary');
        $this->assertSame('A weekly learning summary is ready.', $summary['body']);
        $this->assertStringNotContainsString('Classroom Student', $summary['title'].$summary['body']);

        Artisan::call('mutqin:notify-parent-weekly-summaries');
        $this->assertCount(1, array_filter(
            $this->notices($parent),
            fn (array $notice) => ($notice['title'] ?? '') === 'Weekly progress summary',
        ));
    }

    /**
     * @return array{0: User, 1: User, 2: User, 3: ParentStudentLink}
     */
    private function classroom(): array
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Classroom Teacher',
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Classroom Student',
        ]);
        $parent = User::factory()->create([
            'account_role' => AccountRole::Parent->value,
            'name' => 'Classroom Parent',
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
        $link = ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
        ]);

        return [$teacher, $student, $parent, $link];
    }

    /**
     * @return array<string, mixed>
     */
    private function notice(User $user, string $title): array
    {
        $match = collect($this->notices($user))->first(fn (array $notice) => ($notice['title'] ?? '') === $title);
        $this->assertIsArray($match, $title);

        return $match;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function notices(User $user): array
    {
        return $user->notifications()
            ->where('type', LearningTaskNotification::class)
            ->get()
            ->map(fn ($notice) => is_array($notice->data) ? $notice->data : [])
            ->filter(fn (array $notice) => str_starts_with((string) ($notice['type'] ?? ''), 'parent_'))
            ->values()
            ->all();
    }
}
