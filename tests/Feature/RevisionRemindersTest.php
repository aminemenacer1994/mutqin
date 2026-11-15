<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\RevisionReminderStatus;
use App\Enums\UserSessionStatus;
use App\Mail\RevisionReminderMail;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationProgress;
use App\Models\Organisation;
use App\Models\RevisionReminder;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Models\UserSession;
use App\Notifications\RevisionReminderDueNotification;
use App\Services\RevisionReminders\RevisionReminderDispatchService;
use App\Services\RevisionReminders\RevisionReminderQueryService;
use App\Services\RevisionReminders\RevisionReminderSyncService;
use App\Services\SessionLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RevisionRemindersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-14 12:00:00');
        $this->enableTeacherFeatures();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_sync_creates_progress_reminder_without_duplicates(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 80,
            'repetitions' => 3,
            'completed_at' => now()->subDays(2),
            'metadata' => [
                'next_review' => now()->subDay()->toIso8601String(),
                'zone' => 'Fresh',
                'zone_step' => 1,
                'last_review' => now()->subDays(3)->toIso8601String(),
            ],
        ]);

        $sync = app(RevisionReminderSyncService::class);
        $sync->syncUser($user);
        $sync->syncUser($user);

        $this->assertSame(1, RevisionReminder::query()->where('user_id', $user->id)->count());
        $reminder = RevisionReminder::query()->where('user_id', $user->id)->first();
        $this->assertSame(RevisionReminderStatus::Overdue, $reminder->status);
        $this->assertSame(1, (int) $reminder->surah_number);
        $this->assertSame(1, (int) $reminder->ayah_start);
    }

    public function test_teacher_assignment_due_and_priority_override(): void
    {
        [$teacher, $student] = $this->classroom();

        $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'hifz_category' => 'sabqi',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'repetition_target' => 2,
            'due_at' => today()->addDays(2)->toDateString(),
            'priority' => 'high',
            'student_id' => $student->id,
        ])->assertCreated()->assertJsonPath('assignment.priority', 'high');

        $reminder = RevisionReminder::query()->where('user_id', $student->id)->first();
        $this->assertNotNull($reminder);
        $this->assertSame('high', $reminder->priority->value);
        $this->assertSame(RevisionReminderStatus::Upcoming, $reminder->status);
        $this->assertSame(1, (int) $reminder->ayah_start);
        $this->assertSame(3, (int) $reminder->ayah_end);

        $assignmentId = TeacherAssignment::query()->where('teacher_id', $teacher->id)->value('id');
        $this->actingAs($teacher)->putJson(route('api.teacher.assignments.update', $assignmentId), [
            'kind' => 'practice',
            'hifz_category' => 'sabqi',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'repetition_target' => 2,
            'due_at' => today()->toDateString(),
            'priority' => 'low',
        ])->assertOk()->assertJsonPath('assignment.priority', 'low');

        $reminder->refresh();
        $this->assertSame('low', $reminder->priority->value);
        $this->assertSame(RevisionReminderStatus::Due, $reminder->status);
    }

    public function test_timezone_buckets_and_snooze(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => [
                'timezone' => 'America/New_York',
                'revision_reminders' => [
                    'in_app' => true,
                    'email' => false,
                    'snooze_hours' => 4,
                ],
            ],
        ]);

        // 12:00 UTC is 07:00 America/New_York on Nov 14.
        $reminder = new RevisionReminder;
        $reminder->forceFill([
            'user_id' => $user->id,
            'source_type' => 'progress',
            'source_key' => 'progress:2:1:2026-11-14',
            'surah_number' => 2,
            'ayah_start' => 1,
            'ayah_end' => 1,
            'due_at' => Carbon::parse('2026-11-14 05:00:00', 'UTC'),
            'priority' => 'normal',
            'status' => RevisionReminderStatus::Upcoming->value,
            'session_settings' => ['review' => true],
        ])->save();

        $payload = app(RevisionReminderQueryService::class)->forUser($user, false);
        $this->assertSame(1, $payload['outstanding_count']);
        $this->assertCount(1, $payload['due_today']);

        $this->actingAs($user)
            ->postJson(route('api.revision-reminders.snooze', $reminder), ['hours' => 6])
            ->assertOk()
            ->assertJsonPath('payload.status', 'snoozed');

        $reminder->refresh();
        $this->assertSame(RevisionReminderStatus::Snoozed, $reminder->status);
        $this->assertNotNull($reminder->snoozed_until);
    }

    public function test_student_cannot_snooze_another_users_reminder(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $reminder = new RevisionReminder;
        $reminder->forceFill([
            'user_id' => $owner->id,
            'source_type' => 'progress',
            'source_key' => 'progress:3:1:2026-11-14',
            'surah_number' => 3,
            'ayah_start' => 1,
            'ayah_end' => 1,
            'due_at' => now(),
            'priority' => 'normal',
            'status' => RevisionReminderStatus::Due->value,
        ])->save();

        $this->actingAs($intruder)
            ->postJson(route('api.revision-reminders.snooze', $reminder))
            ->assertNotFound();
    }

    public function test_opt_out_skips_notifications_and_quiet_hours(): void
    {
        Notification::fake();
        Mail::fake();

        $user = User::factory()->create([
            'practice_preferences' => [
                'timezone' => 'UTC',
                'revision_reminders' => [
                    'in_app' => false,
                    'email' => false,
                    'snooze_hours' => 4,
                    'max_emails_per_day' => 1,
                ],
            ],
        ]);

        $reminder = new RevisionReminder;
        $reminder->forceFill([
            'user_id' => $user->id,
            'source_type' => 'progress',
            'source_key' => 'progress:4:1:2026-11-14',
            'surah_number' => 4,
            'ayah_start' => 1,
            'ayah_end' => 1,
            'due_at' => now()->subHour(),
            'priority' => 'normal',
            'status' => RevisionReminderStatus::Due->value,
        ])->save();

        $result = app(RevisionReminderDispatchService::class)->dispatchDue();
        $this->assertSame(0, $result['in_app']);
        $this->assertSame(0, $result['email']);
        Notification::assertNothingSent();
        Mail::assertNothingQueued();

        $user->forceFill([
            'practice_preferences' => [
                'timezone' => 'UTC',
                'revision_reminders' => [
                    'in_app' => true,
                    'email' => true,
                    'snooze_hours' => 4,
                    'max_emails_per_day' => 1,
                ],
            ],
        ])->save();

        // Quiet hours 22–7: set local time to 23:00.
        Carbon::setTestNow('2026-11-14 23:00:00');
        $result = app(RevisionReminderDispatchService::class)->dispatchDue();
        $this->assertSame(0, $result['in_app']);
        Notification::assertNothingSent();

        Carbon::setTestNow('2026-11-14 12:00:00');
        $result = app(RevisionReminderDispatchService::class)->dispatchDue();
        $this->assertSame(1, $result['in_app']);
        $this->assertSame(1, $result['email']);
        Notification::assertSentTo($user, RevisionReminderDueNotification::class);
        Mail::assertQueued(RevisionReminderMail::class);
    }

    public function test_completion_only_after_recorded_session_activity(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        $reminder = new RevisionReminder;
        $reminder->forceFill([
            'user_id' => $user->id,
            'source_type' => 'progress',
            'source_key' => 'progress:5:1:2026-11-14',
            'surah_number' => 5,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'due_at' => now()->subDay(),
            'priority' => 'normal',
            'status' => RevisionReminderStatus::Overdue->value,
            'zone' => 'Fresh',
            'zone_step' => 0,
        ])->save();

        // Merely refreshing statuses must not complete it.
        app(RevisionReminderSyncService::class)->refreshOpenStatuses($user);
        $reminder->refresh();
        $this->assertSame(RevisionReminderStatus::Overdue, $reminder->status);

        $session = UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 5,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Active->value,
            'memorisation_mode' => 'beginner',
            'is_onboarding_example' => false,
            'started_at' => now()->subMinutes(10),
            'last_activity_at' => now(),
            'metadata' => [
                'config' => [
                    'chapterId' => 5,
                    'rangeStart' => 1,
                    'rangeEnd' => 3,
                ],
                'retention_score' => 'Easy',
            ],
        ]);

        app(SessionLifecycleService::class)->end($user, [
            'session_id' => $session->id,
            'range_complete' => true,
            'metadata' => [
                'config' => [
                    'chapterId' => 5,
                    'rangeStart' => 1,
                    'rangeEnd' => 3,
                ],
                'retention_score' => 'Easy',
            ],
        ]);

        $reminder->refresh();
        $this->assertSame(RevisionReminderStatus::Completed, $reminder->status);
        $this->assertSame('session', $reminder->completed_via);

        $followUp = RevisionReminder::query()
            ->where('user_id', $user->id)
            ->where('source_type', 'session')
            ->whereIn('status', RevisionReminderStatus::openValues())
            ->first();
        $this->assertNotNull($followUp);
        $this->assertSame('Fresh', $followUp->zone);
        $this->assertSame(1, (int) $followUp->zone_step);
    }

    public function test_preferences_endpoint_and_dashboard_payload(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 70,
            'repetitions' => 2,
            'completed_at' => now()->subDay(),
            'metadata' => [
                'next_review' => now()->toIso8601String(),
                'zone' => 'Fresh',
                'zone_step' => 0,
            ],
        ]);

        $this->actingAs($user)
            ->patchJson(route('api.revision-reminders.preferences.update'), [
                'revision_reminders' => [
                    'in_app' => true,
                    'email' => true,
                    'snooze_hours' => 8,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('preferences.revision_reminders.email', true)
            ->assertJsonPath('preferences.revision_reminders.snooze_hours', 8);

        $dashboard = $this->actingAs($user)
            ->getJson(route('api.dashboard.show'))
            ->assertOk()
            ->json('data.revision_reminders');

        $this->assertGreaterThanOrEqual(1, (int) ($dashboard['outstanding_count'] ?? 0));
        $this->assertNotEmpty($dashboard['items'] ?? []);
        $this->assertTrue(($dashboard['items'][0]['href'] ?? '') !== '');
        $this->assertStringContainsString('review=1', $dashboard['items'][0]['href']);
    }

    public function test_dismiss_does_not_mark_completed(): void
    {
        $user = User::factory()->create();
        $reminder = new RevisionReminder;
        $reminder->forceFill([
            'user_id' => $user->id,
            'source_type' => 'progress',
            'source_key' => 'progress:6:1:2026-11-14',
            'surah_number' => 6,
            'ayah_start' => 1,
            'ayah_end' => 1,
            'due_at' => now(),
            'priority' => 'normal',
            'status' => RevisionReminderStatus::Due->value,
        ])->save();

        $this->actingAs($user)
            ->postJson(route('api.revision-reminders.dismiss', $reminder))
            ->assertOk()
            ->assertJsonPath('payload.status', 'cancelled');

        $reminder->refresh();
        $this->assertSame(RevisionReminderStatus::Cancelled, $reminder->status);
        $this->assertNull($reminder->completed_at);
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
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Authorised Student',
            'practice_preferences' => ['timezone' => 'UTC'],
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
}
