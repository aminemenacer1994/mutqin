<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AssignmentStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherRecitationReview;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Billing\SubscriptionEntitlement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentActivityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_activity_page_filters_access_resume_and_recordings(): void
    {
        $this->assertSame(5, app(SubscriptionEntitlement::class)->freeSavedSessionsLimit());

        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
            'name' => 'Ustadh Yusuf',
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $other = User::factory()->create(['account_role' => AccountRole::Student->value]);

        $this->getJson(route('api.dashboard.activity'))->assertUnauthorized();

        $saved = $this->makeSession($student, UserSessionStatus::Paused, [
            'memorisation_mode' => 'revision',
            'paused_at' => now()->startOfDay()->addHours(10),
            'last_activity_at' => now()->startOfDay()->addHours(10),
            'metadata' => ['config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 2]],
        ]);
        $completed = $this->makeSession($student, UserSessionStatus::Completed, [
            'memorisation_mode' => 'hifz',
            'ended_at' => now()->subDays(2),
            'last_activity_at' => now()->subDays(2),
            'metadata' => ['completed' => true, 'config' => ['chapterId' => 113, 'rangeStart' => 1, 'rangeEnd' => 1]],
        ]);
        $endedEarly = $this->makeSession($student, UserSessionStatus::EndedEarly, [
            'ended_at' => now()->startOfDay()->addHours(9),
            'last_activity_at' => now()->startOfDay()->addHours(9),
            'metadata' => ['config' => ['chapterId' => 114, 'rangeStart' => 1, 'rangeEnd' => 1]],
        ]);
        $interrupted = $this->makeSession($student, UserSessionStatus::Interrupted, [
            'surah_number' => null,
            'ayah_number' => null,
            'last_activity_at' => now()->startOfDay()->addHours(11),
            'metadata' => [],
        ]);
        $deleted = $this->makeSession($student, UserSessionStatus::Paused, [
            'paused_at' => now()->subMinutes(10),
            'last_activity_at' => now()->subMinutes(10),
        ]);
        $deletedId = $deleted->id;
        $deleted->delete();

        $this->makeSession($other, UserSessionStatus::Completed, [
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true, 'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 1]],
        ]);

        $kept = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 1,
            'accuracy_percent' => 81,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 2],
            'audio_path' => 'attempts/kept.webm',
            'audio_expires_at' => now()->addDay(),
        ]);
        $expired = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 2,
            'accuracy_percent' => null,
            'band' => null,
            'ayah_range' => ['surah' => 112, 'from' => 3, 'to' => 3],
            'audio_path' => 'attempts/expired.webm',
            'audio_expires_at' => now()->subMinute(),
        ]);
        $missingAudio = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 3,
            'accuracy_percent' => 40,
            'band' => 'weak',
            'ayah_range' => ['surah' => 112, 'from' => 4, 'to' => 4],
        ]);
        TeacherRecitationReview::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $kept->id,
            'status' => TeacherRecitationReview::PENDING,
        ]);

        $recipient = $this->assignment($teacher, $student);

        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $organisation->id,
            'teacher_assignment_id' => $recipient->teacher_assignment_id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'Repeat the last word slowly.',
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 2,
        ])->save();

        $own = $this->actingAs($student)->getJson(route('api.dashboard.activity'))->assertOk()->json('activity');
        $this->assertFalse(collect($own)->contains(fn ($event) => ($event['id'] ?? null) === 'session-'.$deletedId));
        $this->assertFalse(collect($own)->contains(fn ($event) => ($event['surah_number'] ?? null) === 1 && ($event['type'] ?? '') === 'session'));

        $foreign = $this->actingAs($other)->getJson(route('api.dashboard.activity'))->assertOk()->json('activity');
        $this->assertFalse(collect($foreign)->contains(fn ($event) => ($event['id'] ?? null) === 'session-'.$saved->id));
        $this->assertFalse(collect($foreign)->contains(fn ($event) => ($event['id'] ?? null) === 'ai-'.$kept->id));

        $savedEvent = collect($own)->firstWhere('id', 'session-'.$saved->id);
        $this->assertSame('session', $savedEvent['type']);
        $this->assertSame('saved', $savedEvent['activity_status']);
        $this->assertSame('revision', $savedEvent['learning_area']);
        $this->assertTrue($savedEvent['can_resume']);
        $this->assertStringContainsString('resume=1', (string) $savedEvent['resume_href']);
        $this->assertStringContainsString('session='.$saved->id, (string) $savedEvent['resume_href']);

        $completedEvent = collect($own)->firstWhere('id', 'session-'.$completed->id);
        $this->assertFalse($completedEvent['can_resume']);
        $this->assertNull($completedEvent['resume_href']);
        $this->assertSame('hifz', $completedEvent['learning_area']);

        $earlyEvent = collect($own)->firstWhere('id', 'session-'.$endedEarly->id);
        $this->assertSame('ended_early', $earlyEvent['activity_status']);
        $this->assertFalse($earlyEvent['can_resume']);
        $this->assertArrayNotHasKey('accuracy', $earlyEvent['outcome_params']);

        $interruptedEvent = collect($own)->firstWhere('id', 'session-'.$interrupted->id);
        $this->assertSame('interrupted', $interruptedEvent['activity_status']);
        $this->assertNull($interruptedEvent['surah_number']);
        $this->assertNull($interruptedEvent['href']);
        $this->assertTrue($interruptedEvent['can_resume']);

        $keptEvent = collect($own)->firstWhere('id', 'ai-'.$kept->id);
        $this->assertSame('ai_word_match', $keptEvent['authority']);
        $this->assertFalse($keptEvent['is_tajweed_assessment']);
        $this->assertSame('strong', $keptEvent['outcome_params']['band']);
        $this->assertSame(81, $keptEvent['outcome_params']['accuracy']);
        $this->assertSame(TeacherRecitationReview::PENDING, $keptEvent['teacher_review_status']);
        $this->assertTrue($keptEvent['recording_available']);
        $this->assertArrayNotHasKey('audio_url', $keptEvent);
        $this->assertArrayNotHasKey('url', $keptEvent);
        $this->assertStringNotContainsString('/audio', json_encode($keptEvent));

        $expiredEvent = collect($own)->firstWhere('id', 'ai-'.$expired->id);
        $this->assertSame('no_result', $expiredEvent['activity_status']);
        $this->assertFalse($expiredEvent['recording_available']);
        $this->assertArrayNotHasKey('band', $expiredEvent['outcome_params']);
        $this->assertArrayNotHasKey('accuracy', $expiredEvent['outcome_params']);

        $missingEvent = collect($own)->firstWhere('id', 'ai-'.$missingAudio->id);
        $this->assertFalse($missingEvent['recording_available']);
        $this->assertNull($missingEvent['teacher_review_status']);

        $feedback = collect($own)->firstWhere('id', 'teacher-feedback-'.$note->id);
        $this->assertSame('reviewed', $feedback['activity_status']);
        $this->assertSame('Ustadh Yusuf', $feedback['teacher_name']);
        $this->assertSame($recipient->teacher_assignment_id, $feedback['assignment_id']);
        $this->assertArrayNotHasKey('recording_available', $feedback);

        $sessions = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'type' => 'session',
            'area' => 'revision',
        ]))->assertOk()->json('activity');
        $this->assertSame([$saved->id], array_column($sessions, 'source_id'));

        $savedOnly = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'status' => 'saved',
        ]))->assertOk()->json('activity');
        $this->assertTrue(collect($savedOnly)->contains(fn ($event) => ($event['id'] ?? null) === 'session-'.$saved->id));
        $this->assertFalse(collect($savedOnly)->contains(fn ($event) => ($event['id'] ?? null) === 'session-'.$completed->id));

        $assignments = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'type' => 'assignment',
        ]))->assertOk()->json('activity');
        $this->assertCount(1, $assignments);
        $this->assertSame($recipient->id, $assignments[0]['recipient_id']);
        $this->assertSame('Ustadh Yusuf', $assignments[0]['teacher_name']);
        $this->assertSame('awaiting_review', $assignments[0]['activity_status']);
        $this->assertArrayNotHasKey('accuracy', $assignments[0]['outcome_params']);

        $today = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'type' => 'session',
            'from' => now()->toDateString(),
            'to' => now()->toDateString(),
        ]))->assertOk()->json('activity');
        $this->assertFalse(collect($today)->contains(fn ($event) => ($event['id'] ?? null) === 'session-'.$completed->id));
        $this->assertTrue(collect($today)->contains(fn ($event) => ($event['id'] ?? null) === 'session-'.$saved->id));

        $future = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'from' => now()->addDay()->toDateString(),
        ]))->assertOk()->json();
        $this->assertSame([], $future['activity']);
        $this->assertFalse($future['has_more']);

        $older = $this->makeSession($student, UserSessionStatus::Completed, [
            'memorisation_mode' => 'tajweed',
            'ended_at' => now()->subDays(3),
            'last_activity_at' => now()->subDays(3),
            'metadata' => ['completed' => true, 'config' => ['chapterId' => 2, 'rangeStart' => 1, 'rangeEnd' => 1]],
        ]);
        $middle = $this->makeSession($student, UserSessionStatus::Completed, [
            'memorisation_mode' => 'tajweed',
            'ended_at' => now()->subDays(2),
            'last_activity_at' => now()->subDays(2),
            'metadata' => ['completed' => true, 'config' => ['chapterId' => 2, 'rangeStart' => 2, 'rangeEnd' => 2]],
        ]);
        $newest = $this->makeSession($student, UserSessionStatus::Completed, [
            'memorisation_mode' => 'tajweed',
            'ended_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'metadata' => ['completed' => true, 'config' => ['chapterId' => 2, 'rangeStart' => 3, 'rangeEnd' => 3]],
        ]);
        $page = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'type' => 'session',
            'area' => 'tajweed',
            'limit' => 2,
        ]))->assertOk()->json();
        $this->assertTrue($page['has_more']);
        $this->assertSame(2, $page['next_offset']);
        $this->assertSame([$newest->id, $middle->id], array_column($page['activity'], 'source_id'));
        $next = $this->actingAs($student)->getJson(route('api.dashboard.activity', [
            'type' => 'session',
            'area' => 'tajweed',
            'limit' => 2,
            'offset' => 2,
        ]))->assertOk()->json();
        $this->assertFalse($next['has_more']);
        $this->assertSame($older->id, $next['activity'][0]['source_id']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeSession(User $user, UserSessionStatus $status, array $overrides = []): UserSession
    {
        return UserSession::query()->create(array_merge([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => $status,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
        ], $overrides));
    }

    private function assignment(User $teacher, User $student): TeacherAssignmentRecipient
    {
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'activity' => 'revision',
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 2,
            'due_at' => now(),
        ]);

        return TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::AwaitingConfirmation->value,
            'student_completed_at' => now()->subHour(),
        ]);
    }
}
