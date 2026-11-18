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
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\Organisation;
use App\Enums\AssignmentKind;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\RevisionRecommendation;
use App\Models\TeacherRecitationReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetricConsistencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_review_queue_matches_its_list_and_leaves_legacy_checks_unchanged(): void
    {
        [$teacher, $student, $hidden] = $this->classroom();
        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'ai_recite',
            'hifz_category' => 'sabqi',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'due_at' => today()->addDay()->toDateString(),
        ])->assertCreated()->json();
        $recipientId = $created['recipients'][0]['id'];

        $linked = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => 81,
            'band' => 'mixed',
            'audio_path' => 'recitations/linked.webm',
            'audio_expires_at' => now()->addDay(),
        ]);
        $duplicate = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => 81,
            'band' => 'mixed',
            'attempt_number' => 1,
            'audio_path' => 'recitations/duplicate.webm',
            'audio_expires_at' => now()->addDay(),
        ]);
        $legacy = $this->attempt($student, ['accuracy_percent' => 70, 'band' => 'weak']);
        $otherTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);
        $foreignRecipient = TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => TeacherAssignment::factory()->create([
                'teacher_id' => $otherTeacher->id,
                'organisation_id' => $teacher->organisation_id,
                'kind' => AssignmentKind::AiRecite->value,
            ])->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Pending->value,
        ]);
        $foreign = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $foreignRecipient->id,
            'accuracy_percent' => 64,
            'band' => 'weak',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 4],
        ]);
        $invalid = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => null,
            'band' => null,
        ]);
        $hiddenAttempt = $this->attempt($hidden, ['accuracy_percent' => 90, 'band' => 'strong']);
        $this->assertNotNull($duplicate);
        $this->assertNotNull($invalid);
        $this->assertNotNull($hiddenAttempt);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $queue = $overview['review_queue']['actionable'];
        $reviewed = $overview['review_queue']['reviewed'];
        $history = $overview['review_queue']['history'];
        $this->assertCount(1, $queue);
        $this->assertSame($overview['snapshot']['recitations_awaiting_review'], count($queue));
        $this->assertContains($queue[0]['id'], [$linked->id, $duplicate->id]);
        $this->assertSame('awaiting', $queue[0]['review_status']);
        $this->assertTrue($queue[0]['has_recording']);
        $this->assertSame([], $reviewed);
        $this->assertSame(0, $overview['snapshot']['reviewed_recitations']);
        $this->assertEqualsCanonicalizing([$legacy->id, $foreign->id], array_column($history, 'id'));
        $this->assertSame($overview['snapshot']['recitation_history'], count($history));
        $this->assertSame(1, $overview['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertContains($legacy->id, array_column($history, 'id'));
        $historyLegacy = collect($history)->firstWhere('id', $legacy->id);
        $this->assertSame('history', $historyLegacy['review_status']);
        $this->assertFalse($historyLegacy['has_recording']);
        $this->assertSame(0, $overview['snapshot']['submissions_awaiting_review']);
        $this->assertSame(0, $overview['assignments']['awaiting_confirmation']);
        $this->assertDatabaseMissing('teacher_recitation_reviews', ['ai_recite_attempt_id' => $legacy->id]);
        $this->assertDatabaseMissing('teacher_recitation_reviews', ['ai_recite_attempt_id' => $foreign->id]);
        $this->assertSame(70, $legacy->fresh()->accuracy_percent);
        $this->assertSame(64, $foreign->fresh()->accuracy_percent);

        $this->actingAs($student)->getJson(route('api.teacher.overview'))->assertForbidden();
        $other = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);
        $this->actingAs($other)->getJson(route('api.teacher.students.show', $student))->assertNotFound();
        $otherOverview = $this->actingAs($other)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame(0, $otherOverview['snapshot']['recitations_awaiting_review']);
        $this->assertSame(0, $otherOverview['snapshot']['reviewed_recitations']);
        $this->assertSame(0, $otherOverview['snapshot']['recitation_history']);
        $this->assertSame([], $otherOverview['review_queue']['actionable']);
        $this->assertSame([], $otherOverview['review_queue']['reviewed']);
        $this->assertSame([], $otherOverview['review_queue']['history']);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.review', [$student, $linked]))->assertOk();
        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.review', [$student, $linked]))->assertOk();
        $this->assertSame(1, TeacherRecitationReview::query()->where('ai_recite_attempt_id', $linked->id)->count());
        $this->assertSame(81, $linked->fresh()->accuracy_percent);
        $this->assertSame('reviewed', TeacherRecitationReview::query()->where('ai_recite_attempt_id', $linked->id)->value('status'));

        $after = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame([], $after['review_queue']['actionable']);
        $this->assertSame(0, $after['snapshot']['recitations_awaiting_review']);
        $this->assertSame([$linked->id], array_column($after['review_queue']['reviewed'], 'id'));
        $this->assertSame(1, $after['snapshot']['reviewed_recitations']);
        $this->assertSame('reviewed', $after['review_queue']['reviewed'][0]['review_status']);
        $this->assertTrue($after['review_queue']['reviewed'][0]['has_recording']);
        $this->assertEqualsCanonicalizing([$legacy->id, $foreign->id], array_column($after['review_queue']['history'], 'id'));
        $this->assertSame(2, $after['snapshot']['recitation_history']);
        $this->assertSame(1, $after['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertDatabaseMissing('teacher_recitation_reviews', ['ai_recite_attempt_id' => $legacy->id]);
        $this->assertDatabaseMissing('teacher_recitation_reviews', ['ai_recite_attempt_id' => $foreign->id]);
    }

    public function test_an_open_legacy_review_is_actionable_without_rewriting_history(): void
    {
        [$teacher, $student] = $this->classroom();
        $legacy = $this->attempt($student, ['accuracy_percent' => 55, 'band' => 'weak']);
        TeacherRecitationReview::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $legacy->id,
            'status' => TeacherRecitationReview::PENDING,
        ]);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame([$legacy->id], array_column($overview['review_queue']['actionable'], 'id'));
        $this->assertSame(1, $overview['snapshot']['recitations_awaiting_review']);
        $this->assertSame([], $overview['review_queue']['history']);
        $this->assertSame(0, $overview['snapshot']['recitation_history']);
        $this->assertSame(0, $overview['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertSame(TeacherRecitationReview::PENDING, TeacherRecitationReview::query()->where('ai_recite_attempt_id', $legacy->id)->value('status'));
        $this->assertSame(55, $legacy->fresh()->accuracy_percent);
    }

    public function test_overdue_is_a_date_and_invalid_attempts_do_not_count(): void
    {
        [$teacher, $student] = $this->classroom();
        $created = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'ai_recite',
            'hifz_category' => 'sabqi',
            'student_id' => $student->id,
            'surah_number' => 2,
            'ayah_start' => 1,
            'ayah_end' => 5,
            'due_at' => today()->subDay()->toDateString(),
        ])->assertCreated()->json();
        $recipientId = $created['recipients'][0]['id'];
        $this->actingAs($student)->postJson(route('api.me.assignments.start', $recipientId))->assertOk();

        $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => 40,
            'band' => 'failed',
            'ayah_range' => ['surah' => 2, 'from' => 1, 'to' => 5],
        ]);
        $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => 88,
            'band' => 'strong',
            'ayah_range' => ['surah' => 2, 'from' => 1, 'to' => 5],
        ]);
        $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => 88,
            'band' => 'strong',
            'ayah_range' => ['surah' => 2, 'from' => 1, 'to' => 5],
        ]);

        $row = $this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data.0.recipients.0');
        $this->assertSame(AssignmentStatus::InProgress->value, $row['status']);
        $this->assertTrue($row['task_overdue_overlay']);
        $this->assertSame(1, $row['progress']['activity_count']);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame(1, $overview['assignments']['overdue']);
        $this->assertSame(0, $overview['assignments']['in_progress']);
        $profile = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertOk()->json();
        $this->assertSame(1, $profile['payload']['metrics']['assignments']['overdue']);
        $this->assertSame(0, $profile['payload']['metrics']['assignments']['in_progress']);

        $done = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'hifz_category' => 'sabaq',
            'activity' => 'nazra',
            'recording_required' => false,
            'student_id' => $student->id,
            'surah_number' => 2,
            'ayah_start' => 6,
            'ayah_end' => 7,
            'due_at' => today()->subDays(3)->toDateString(),
        ])->assertCreated()->json();
        $doneRecipient = $done['recipients'][0]['id'];
        \App\Models\TeacherAssignmentRecipient::query()->whereKey($doneRecipient)->update([
            'status' => AssignmentStatus::Completed->value,
            'completed_at' => now(),
        ]);
        $completed = collect($this->actingAs($teacher)->getJson(route('api.teacher.assignments'))->assertOk()->json('data'))
            ->first(fn (array $assignment) => (int) $assignment['assignment']['ayah_start'] === 6);
        $this->assertSame(AssignmentStatus::Completed->value, $completed['recipients'][0]['status']);
        $this->assertFalse($completed['recipients'][0]['task_overdue_overlay']);
    }

    public function test_reviews_due_today_are_not_counted_as_overdue(): void
    {
        [$teacher, $student] = $this->classroom();
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $student->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 7,
        ]);
        foreach ([now(), now()->subDay()] as $index => $when) {
            MemorisationPracticePlan::query()->create([
                'user_id' => $student->id,
                'assessment_id' => $assessment->id,
                'title' => 'Review '.$index,
                'status' => MemorisationPracticePlan::STATUS_ACTIVE,
                'surah_number' => 1,
                'start_ayah' => 1,
                'end_ayah' => 7,
                'practice_scope' => 'scheduled-'.$index,
                'recommended_review_at' => $when,
            ]);
        }

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame(1, $overview['snapshot']['reviews_due_today']);
        $this->assertSame(1, $overview['kpis']['overdue_revisions']);
        $studentRow = collect($this->actingAs($teacher)->getJson(route('api.teacher.students'))->assertOk()->json('data'))->firstWhere('id', $student->id);
        $this->assertSame(1, $studentRow['revision_overdue']);
    }

    public function test_duplicate_revision_assignment_is_not_created_twice(): void
    {
        [$teacher, $student] = $this->classroom();
        $attempt = $this->attempt($student, ['accuracy_percent' => 60, 'band' => 'weak']);
        $payload = ['due_at' => today()->addDay()->toDateString(), 'feedback' => 'Repeat slowly'];

        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.revision', [$student, $attempt]), $payload)->assertCreated();
        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.revision', [$student, $attempt]), $payload)->assertCreated();

        $this->assertSame(1, TeacherAssignment::query()->where('teacher_id', $teacher->id)->count());
        $this->assertSame(60, $attempt->fresh()->accuracy_percent);
        $this->assertSame(1, TeacherRecitationReview::query()->where('ai_recite_attempt_id', $attempt->id)->count());
    }

    public function test_empty_class_counts_are_zero(): void
    {
        $teacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => Organisation::factory()->create()->id,
        ]);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame(0, $overview['snapshot']['recitations_awaiting_review']);
        $this->assertSame(0, $overview['snapshot']['reviewed_recitations']);
        $this->assertSame(0, $overview['snapshot']['recitation_history']);
        $this->assertSame(0, $overview['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertSame(0, $overview['snapshot']['reviews_due_today']);
        $this->assertSame(0, $overview['snapshot']['submissions_awaiting_review']);
        $this->assertSame([], $overview['review_queue']['actionable']);
        $this->assertSame([], $overview['review_queue']['reviewed']);
        $this->assertSame([], $overview['review_queue']['history']);
        $this->assertSame(0, $overview['hifz']['memorised_ayahs']);
        $this->assertSame(0, $overview['hifz']['unique_memorised_ayahs']);
        $this->assertSame('sum_of_student_ayahs', $overview['hifz']['counting']);
        $this->assertSame([], $overview['revision_decisions']);
    }

    public function test_revision_decisions_keep_this_teachers_open_rows(): void
    {
        [$teacher, $student] = $this->classroom();
        $other = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);
        $this->recommendation($teacher, $student, 'accepted', 'accepted-1');
        $this->recommendation($teacher, $student, 'dismissed', 'dismissed-1');
        $this->recommendation($other, $student, 'pending', 'other-1');

        $rows = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json('revision_decisions');
        $this->assertCount(1, $rows);
        $this->assertSame('accepted', $rows[0]['status']);
        $this->assertSame($student->id, $rows[0]['student_id']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function attempt(User $student, array $overrides = []): AiReciteAttempt
    {
        return AiReciteAttempt::query()->create(array_merge([
            'user_id' => $student->id,
            'attempt_number' => 1,
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 7],
            'accuracy_percent' => 80,
            'band' => 'mixed',
        ], $overrides));
    }

    private function recommendation(User $teacher, User $student, string $status, string $key): void
    {
        RevisionRecommendation::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'status' => $status,
            'activity' => 'revision',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'reason_code' => 'weak',
            'reason' => 'Needs another hearing',
            'source_key' => $key,
        ]);
    }

    /**
     * @return array{0: User, 1: User, 2: User}
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
        GroupMembership::factory()->create([
            'learning_group_id' => $group->id,
            'user_id' => $hidden->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::None->value,
        ]);

        return [$teacher, $student, $hidden];
    }
}
