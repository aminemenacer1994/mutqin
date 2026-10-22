<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Organisations\GroupMembershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_only_teachers_can_open_the_dashboard(): void
    {
        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);

        $this->actingAs($student)->get(route('teacher.dashboard'))->assertForbidden();
        $this->actingAs($student)->getJson(route('api.teacher.overview'))->assertForbidden();

        $teacher = User::factory()->create(['account_role' => AccountRole::Teacher->value]);
        $this->actingAs($teacher)->get(route('teacher.dashboard'))
            ->assertOk()
            ->assertSee('teacher-dashboard', false)
            ->assertSee('teacher-dashboard.css', false);
    }

    public function test_overview_uses_authorised_records_only(): void
    {
        [$teacher, $student, $hidden] = $this->classroom();
        $organisation = $teacher->organisation;

        UserSession::query()->create([
            'user_id' => $student->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => 'completed',
            'session_duration_seconds' => 120,
            'last_activity_at' => now(),
            'ended_at' => now(),
            'metadata' => ['range_start' => 1, 'range_end' => 7],
        ]);
        UserSession::query()->create([
            'user_id' => $hidden->id,
            'surah_number' => 2,
            'ayah_number' => 1,
            'status' => 'completed',
            'last_activity_at' => now(),
        ]);
        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 1,
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 7],
            'color_counts' => ['red' => 1, 'black' => 2, 'gray' => 0],
        ]);
        MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'spot_type' => 'ayah',
            'surah_number' => 1,
            'ayah_number' => 2,
            'spot_key' => 'ayah:1:2:ayah',
            'affected_attempt_count' => 1,
            'status' => 'active',
        ]);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview', ['days' => 7]))->assertOk()->json();

        $this->assertSame(1, $overview['kpis']['authorised_students']);
        $this->assertSame(1, $overview['kpis']['active_7_days']);
        $this->assertEquals(80, $overview['kpis']['ai_success_rate']);
        $this->assertSame(1, $overview['chart']['total']);
        $this->assertSame($student->name, $overview['recent_ai'][0]['student_name']);
        $this->assertSame(80, $overview['recent_ai'][0]['accuracy_percent']);
        $this->assertSame($organisation->name, $overview['roster']['organisation']['name']);
        $this->assertCount(1, $overview['roster']['teachers']);
        $this->assertTrue($overview['roster']['teachers'][0]['is_you']);
        $this->assertCount(1, $overview['roster']['students']);
        $this->assertSame($student->name, $overview['roster']['students'][0]['name']);
        $this->assertSame('Hidden Student', $hidden->name);
        $this->assertNotContains($hidden->name, array_column($overview['roster']['students'], 'name'));

        $students = $this->actingAs($teacher)->getJson(route('api.teacher.students'))->assertOk()->json('data');
        $this->assertCount(1, $students);
        $this->assertSame($student->id, $students[0]['id']);
        $this->assertSame(1, $students[0]['sessions']);
        $this->assertSame(1, $students[0]['weak_count']);
        $this->assertEquals(80, $students[0]['ai_success_rate']);

        $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $hidden))->assertNotFound();
        $profile = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'ai']))->assertOk()->json();
        $this->assertSame(80, $profile['payload']['success_rate']);
        $this->assertSame(1, $profile['payload']['attempts'][0]['issues']['wrong']);
        $this->assertSame(2, $profile['payload']['attempts'][0]['issues']['skipped']);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'overview']))->assertOk()->json('payload');
        $this->assertArrayHasKey('latest_saved', $overview);
        $this->assertArrayHasKey('needs_attention', $overview['metrics']);
        $this->assertArrayHasKey('active_7', $overview['metrics']);
        $this->assertSame(1, $overview['metrics']['ai_attempts']);
        $this->assertArrayHasKey('assignments', $overview['metrics']);

        $tasks = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'tasks']))->assertOk()->json('payload');
        $this->assertArrayHasKey('assignments', $tasks);

        $analytics = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'analytics']))->assertOk()->json('payload');
        $this->assertSame(80, $analytics['success_rate']);
        $this->assertArrayHasKey('sessions', $analytics);
        $this->assertArrayHasKey('weak', $analytics);
        $this->assertArrayHasKey('attempts', $analytics);
        $this->assertArrayHasKey('calendar', $analytics);
    }

    public function test_duplicate_weak_rows_are_collapsed_without_hiding_distinct_word_findings(): void
    {
        [$teacher, $student] = $this->classroom();

        foreach ([1, 2] as $wordIndex) {
            MemorisationWeakSpot::query()->create([
                'user_id' => $student->id,
                'spot_type' => 'word',
                'surah_number' => 114,
                'ayah_number' => 1,
                'word_index' => $wordIndex,
                'spot_key' => 'word:114:1:'.$wordIndex,
                'affected_attempt_count' => 2,
                'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            ]);
        }
        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'accuracy_percent' => 40,
            'band' => 'weak',
            'ayah_range' => ['surah' => 114, 'from' => 1, 'to' => 1],
        ]);
        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 114, 'from' => 1, 'to' => 1],
        ]);

        $students = $this->actingAs($teacher)->getJson(route('api.teacher.students'))->assertOk()->json('data');
        $this->assertSame(1, $students[0]['weak_count']);
        $this->assertSame(60, $students[0]['ai_success_rate']);

        $weak = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'weak']))
            ->assertOk()->json('payload.items');
        $this->assertCount(2, $weak);

        $ai = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'ai']))
            ->assertOk()->json('payload');
        $this->assertSame(60, $ai['success_rate']);
        $this->assertSame(2, $ai['score_count']);
        $this->assertNotNull($ai['score_window_start']);
        $this->assertNotNull($ai['score_window_end']);
    }

    public function test_hard_ayahs_exclude_resolved_history_and_keep_distinct_words(): void
    {
        [$teacher, $student] = $this->classroom();

        foreach ([0, 1] as $wordIndex) {
            MemorisationWeakSpot::query()->create([
                'user_id' => $student->id,
                'spot_type' => 'word',
                'surah_number' => 114,
                'ayah_number' => 1,
                'word_index' => $wordIndex,
                'spot_key' => 'word:114:1:'.$wordIndex,
                'affected_attempt_count' => 2,
                'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            ]);
        }
        MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'spot_type' => 'word',
            'surah_number' => 114,
            'ayah_number' => 1,
            'word_index' => 2,
            'spot_key' => 'word:114:1:2',
            'affected_attempt_count' => 5,
            'status' => MemorisationWeakSpot::STATUS_RESOLVED,
        ]);

        $items = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'weak']))
            ->assertOk()
            ->json('payload.items');

        $this->assertCount(2, $items);
        $this->assertEqualsCanonicalizing([0, 1], array_column($items, 'word_index'));
    }

    public function test_revoked_consent_removes_access_immediately(): void
    {
        [$teacher, $student] = $this->classroom();
        $membership = GroupMembership::query()->where('user_id', $student->id)->firstOrFail();

        $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
        ])->assertCreated();
        $this->assertCount(1, $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data'));

        app(GroupMembershipService::class)->revokeAnalyticsConsent($student, $membership);

        $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertNotFound();
        $this->assertSame(0, $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->json('kpis.authorised_students'));
        $this->assertSame([], $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data'));
    }

    public function test_teacher_approval_requires_student_consent_and_removal_revokes_access(): void
    {
        $organisation = Organisation::factory()->create();
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $organisation->id,
        ]);
        $student = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);
        $service = app(GroupMembershipService::class);
        $service->joinAsTeacher($teacher, $group);
        $membership = $service->requestJoin($student, $group);

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.memberships.approve', $membership))
            ->assertStatus(422);

        $service->grantAnalyticsConsent($student, $membership->fresh());

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.memberships.approve', $membership))
            ->assertOk()
            ->assertJsonPath('status', MembershipStatus::Approved->value);

        $this->assertSame(1, $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->json('kpis.authorised_students'));

        $this->actingAs($teacher)
            ->postJson(route('api.teacher.memberships.remove', $membership))
            ->assertOk();

        $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertNotFound();
        $this->assertSame(MembershipStatus::Rejected, $membership->fresh()->status);
    }

    public function test_assignments_link_only_authorised_students_and_compare_equivalent_ranges(): void
    {
        [$teacher, $student, $hidden, $group] = $this->classroom();

        $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'student_id' => $hidden->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
        ])->assertStatus(422);

        $before = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 1,
            'accuracy_percent' => 60,
            'band' => 'weak',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 3],
        ]);
        $before->forceFill([
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ])->save();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'ai_recite',
            'learning_group_id' => $group->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'repetition_target' => 1,
            'feedback' => 'Recite slowly.',
        ])->assertCreated()->json();

        $this->assertCount(1, $created['recipients']);
        $this->assertSame($student->id, $created['recipients'][0]['student_id']);

        $recipientId = $created['recipients'][0]['id'];
        $started = $this->actingAs($student)
            ->postJson(route('api.me.assignments.start', $recipientId))
            ->assertOk()
            ->json();
        $this->assertStringContainsString('assignment_recipient='.$recipientId, $started['href']);

        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'teacher_assignment_recipient_id' => $recipientId,
            'attempt_number' => 2,
            'accuracy_percent' => 90,
            'band' => 'strong',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 3],
        ]);
        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 3,
            'accuracy_percent' => 100,
            'band' => 'strong',
            'ayah_range' => ['surah' => 1, 'from' => 4, 'to' => 5],
        ]);

        $rows = $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data');
        $comparison = $rows[0]['recipients'][0]['comparison'];
        $this->assertTrue($comparison['available']);
        $this->assertSame(60, $comparison['before']['accuracy_percent']);
        $this->assertSame(90, $comparison['after']['accuracy_percent']);
        $this->assertSame(30, $comparison['accuracy_delta']);
        $this->assertSame(AssignmentStatus::AwaitingConfirmation->value, $rows[0]['recipients'][0]['status']);

        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'teacher_assignment_recipient_id' => $recipientId,
            'attempt_number' => 5,
            'accuracy_percent' => null,
            'band' => 'unavailable',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 3],
        ]);

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $this->assertSame(1, $support['assignments'][0]['progress']['attempt_count']);

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $this->assertSame('Recite slowly.', $support['assignments'][0]['assignment']['feedback']);
        $this->assertSame(1, $support['assignments'][0]['progress']['completed']);
        $this->assertSame(1, $support['assignments'][0]['progress']['target']);
        $this->assertArrayNotHasKey('private', $support);

        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'teacher_assignment_recipient_id' => $recipientId,
            'attempt_number' => 4,
            'accuracy_percent' => 85,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 3],
        ]);

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $this->assertSame(1, $support['assignments'][0]['progress']['completed']);
        $this->assertSame(1, $support['assignments'][0]['progress']['target']);
        $this->assertSame(2, $support['assignments'][0]['progress']['activity_count']);
        $this->assertSame(2, $support['assignments'][0]['progress']['attempt_count']);

        $this->assertStringContainsString('surah=1', $started['href']);
        $this->assertStringContainsString('ai_check=1', $started['href']);
        $this->assertStringContainsString('from=1', $started['href']);

        $this->actingAs($hidden)
            ->postJson(route('api.me.assignments.start', $created['recipients'][0]['id']))
            ->assertNotFound();

        $this->assertSame(0, TeacherAssignmentRecipient::query()->where('student_id', $hidden->id)->count());
    }

    public function test_practice_assignment_only_counts_a_linked_completion_and_caps_progress_at_target(): void
    {
        [$teacher, $student] = $this->classroom();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
        ])->assertCreated()->json();

        $recipientId = $created['recipients'][0]['id'];

        // A matching range from ordinary practice is preserved as history but
        // cannot satisfy a teacher task it was not launched from.
        UserSession::query()->create([
            'user_id' => $student->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => 'completed',
            'last_activity_at' => now(),
            'ended_at' => now(),
            'metadata' => ['range_start' => 1, 'range_end' => 7],
        ]);

        $rows = $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data');
        $this->assertSame(AssignmentStatus::Pending->value, $rows[0]['recipients'][0]['status']);
        $this->assertSame($created['assignment']['id'], $rows[0]['assignment']['id']);

        $this->actingAs($student)
            ->postJson(route('api.me.assignments.start', $recipientId))
            ->assertOk();

        $this->actingAs($student)->postJson(route('api.session.start'), [
            'surah_number' => 1,
            'ayah_number' => 2,
            'idempotency_key' => 'assignment-practice-wrong-range',
            'teacher_assignment_recipient_id' => $recipientId,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 2, 'rangeEnd' => 7]],
        ])->assertStatus(422);

        $first = $this->actingAs($student)->postJson(route('api.session.start'), [
            'surah_number' => 1,
            'ayah_number' => 1,
            'idempotency_key' => 'assignment-practice-first',
            'teacher_assignment_recipient_id' => $recipientId,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ])->assertOk()->json('session');

        $this->assertSame($recipientId, $first['teacher_assignment_recipient_id']);

        $this->actingAs($student)->postJson(route('api.session.end'), [
            'session_id' => $first['id'],
            'idempotency_key' => 'assignment-practice-first-end',
            'range_complete' => true,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ])->assertOk();

        $rows = $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data');
        $progress = $rows[0]['recipients'][0]['progress'];
        $this->assertSame(AssignmentStatus::AwaitingConfirmation->value, $rows[0]['recipients'][0]['status']);
        $this->assertSame(1, $progress['completed']);
        $this->assertSame(1, $progress['target']);

        $second = $this->actingAs($student)->postJson(route('api.session.start'), [
            'surah_number' => 1,
            'ayah_number' => 1,
            'idempotency_key' => 'assignment-practice-second',
            'teacher_assignment_recipient_id' => $recipientId,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ])->assertOk()->json('session');

        $this->actingAs($student)->postJson(route('api.session.end'), [
            'session_id' => $second['id'],
            'idempotency_key' => 'assignment-practice-second-end',
            'range_complete' => true,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ])->assertOk();

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $progress = $support['assignments'][0]['progress'];
        $this->assertSame(1, $progress['completed']);
        $this->assertSame(1, $progress['target']);
        $this->assertSame(2, $progress['activity_count']);
    }

    public function test_student_can_mark_a_task_complete_and_teacher_sees_the_same_linked_status(): void
    {
        [$teacher, $student] = $this->classroom();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
        ])->assertCreated()->json();

        $recipientId = $created['recipients'][0]['id'];

        $this->actingAs($student)
            ->postJson(route('api.me.assignments.complete', $recipientId))
            ->assertStatus(422);

        $this->actingAs($student)->postJson(route('api.me.assignments.start', $recipientId))->assertOk();
        $session = $this->actingAs($student)->postJson(route('api.session.start'), [
            'surah_number' => 1,
            'ayah_number' => 1,
            'idempotency_key' => 'assignment-confirmation-session',
            'teacher_assignment_recipient_id' => $recipientId,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ])->assertOk()->json('session');
        $this->actingAs($student)->postJson(route('api.session.end'), [
            'session_id' => $session['id'],
            'idempotency_key' => 'assignment-confirmation-session-end',
            'range_complete' => true,
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ])->assertOk();

        $support = $this->actingAs($student)
            ->postJson(route('api.me.assignments.complete', $recipientId))
            ->assertOk()
            ->json();

        $this->assertSame(AssignmentStatus::Completed->value, $support['assignments'][0]['status']);
        $this->assertArrayNotHasKey('groups', $support);
        $recipient = TeacherAssignmentRecipient::query()->findOrFail($recipientId);
        $this->assertNotNull($recipient->student_completed_at);
        $this->assertSame(1, $recipient->completion_evidence['activity_count']);
        $this->assertSame(1, $recipient->completion_evidence['target']);

        $this->actingAs($student)
            ->postJson(route('api.me.assignments.complete', $recipientId))
            ->assertOk();
        $this->assertSame($recipient->student_completed_at->toISOString(), $recipient->fresh()->student_completed_at->toISOString());

        $teacherRows = $this->actingAs($teacher)
            ->getJson(route('api.teacher.assignments'))
            ->assertOk()
            ->json('data');

        $this->assertSame(AssignmentStatus::Completed->value, $teacherRows[0]['recipients'][0]['status']);

        $tasks = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', ['student' => $student, 'section' => 'tasks']))
            ->assertOk()
            ->json('payload.assignments');

        $this->assertSame(AssignmentStatus::Completed->value, $tasks[0]['status']);
    }

    public function test_date_only_task_is_not_overdue_until_after_its_due_day(): void
    {
        [$teacher, $student] = $this->classroom();

        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'due_at' => today()->toDateString(),
        ])->assertCreated()->json();

        $rows = $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data');
        $this->assertSame(AssignmentStatus::Pending->value, $rows[0]['recipients'][0]['status']);

        $recipient = TeacherAssignmentRecipient::query()->findOrFail($created['recipients'][0]['id']);
        $recipient->assignment->forceFill(['due_at' => today()->subDay()->toDateString()])->save();

        $rows = $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data');
        $this->assertSame(AssignmentStatus::Overdue->value, $rows[0]['recipients'][0]['status']);
    }

    public function test_teacher_can_edit_or_remove_only_an_unstarted_task(): void
    {
        [$teacher, $student] = $this->classroom();
        $otherTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);
        $input = [
            'kind' => 'practice',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'repetition_target' => 1,
        ];
        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), $input)->assertCreated()->json();
        $id = $created['assignment']['id'];
        $recipientId = $created['recipients'][0]['id'];

        $this->assertTrue($this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->json('data.0.can_manage'));
        $updated = $this->actingAs($teacher)->putJson(route('api.teacher.assignments.update', $id), [
            'kind' => 'ai_recite',
            'surah_number' => 1,
            'ayah_start' => 2,
            'ayah_end' => 4,
            'repetition_target' => 2,
            'feedback' => 'Use a measured pace.',
        ])->assertOk()->json('assignment');
        $this->assertSame('ai_recite', $updated['kind']);
        $this->assertSame(2, $updated['ayah_start']);
        $this->assertSame('Use a measured pace.', $updated['feedback']);

        $this->actingAs($otherTeacher)->putJson(route('api.teacher.assignments.update', $id), $input)->assertNotFound();
        $this->actingAs($otherTeacher)->deleteJson(route('api.teacher.assignments.destroy', $id))->assertNotFound();

        $this->actingAs($student)->postJson(route('api.me.assignments.start', $recipientId))->assertOk();
        $this->assertFalse($this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->json('data.0.can_manage'));
        $this->actingAs($teacher)->putJson(route('api.teacher.assignments.update', $id), $input)->assertStatus(422);
        $this->actingAs($teacher)->deleteJson(route('api.teacher.assignments.destroy', $id))->assertStatus(422);
        $this->assertDatabaseHas('teacher_assignments', ['id' => $id, 'ayah_start' => 2]);

        $unused = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), $input)->assertCreated()->json('assignment.id');
        $this->actingAs($teacher)->deleteJson(route('api.teacher.assignments.destroy', $unused))->assertOk()->assertJsonPath('removed', true);
        $this->assertDatabaseMissing('teacher_assignments', ['id' => $unused]);
    }

    public function test_existing_learner_dashboard_still_loads(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
        $this->actingAs($user)->get(route('progress.dashboard'))->assertOk();
        $this->actingAs($user)->getJson(route('api.me.support'))->assertOk()->assertJsonPath('assignments', []);
    }

    /**
     * @return array{0: User, 1: User, 2: User, 3: LearningGroup}
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
        ]);
        $hidden = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $organisation->id,
            'name' => 'Hidden Student',
        ]);
        $group = LearningGroup::factory()->create(['organisation_id' => $organisation->id, 'name' => 'Morning Halaqa']);
        $otherGroup = LearningGroup::factory()->create(['organisation_id' => $organisation->id]);

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
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $hidden->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::None->value,
        ]);
        GroupMembership::factory()->create([
            'learning_group_id' => $otherGroup->id,
            'user_id' => $hidden->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $hidden->id,
        ]);

        return [$teacher, $student, $hidden, $group];
    }
}
