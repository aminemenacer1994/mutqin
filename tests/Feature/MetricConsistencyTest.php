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
use App\Models\TeacherAssignment;
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

        $linked = $this->attempt($student, ['teacher_assignment_recipient_id' => $recipientId, 'accuracy_percent' => 81, 'band' => 'mixed']);
        $duplicate = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $recipientId,
            'accuracy_percent' => 81,
            'band' => 'mixed',
            'attempt_number' => 1,
        ]);
        $legacy = $this->attempt($student, ['accuracy_percent' => 70, 'band' => 'weak']);
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
        $this->assertCount(1, $queue);
        $this->assertSame($overview['snapshot']['recitations_awaiting_review'], count($queue));
        $this->assertContains($queue[0]['id'], [$linked->id, $duplicate->id]);
        $this->assertSame(1, $overview['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertSame(0, $overview['snapshot']['submissions_awaiting_review']);
        $this->assertSame(0, $overview['assignments']['awaiting_confirmation']);
        $this->assertDatabaseMissing('teacher_recitation_reviews', ['ai_recite_attempt_id' => $legacy->id]);
        $this->assertSame(70, $legacy->fresh()->accuracy_percent);

        $this->actingAs($student)->getJson(route('api.teacher.overview'))->assertForbidden();
        $other = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $teacher->organisation_id,
        ]);
        $this->actingAs($other)->getJson(route('api.teacher.students.show', $student))->assertNotFound();
        $this->assertSame(0, $this->actingAs($other)->getJson(route('api.teacher.overview'))->assertOk()->json('snapshot.recitations_awaiting_review'));

        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.review', [$student, $linked]))->assertOk();
        $this->actingAs($teacher)->postJson(route('api.teacher.students.attempts.playback.review', [$student, $linked]))->assertOk();
        $this->assertSame(1, TeacherRecitationReview::query()->where('ai_recite_attempt_id', $linked->id)->count());
        $this->assertSame(81, $linked->fresh()->accuracy_percent);
        $this->assertSame('reviewed', TeacherRecitationReview::query()->where('ai_recite_attempt_id', $linked->id)->value('status'));

        $after = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame([], $after['review_queue']['actionable']);
        $this->assertSame(0, $after['snapshot']['recitations_awaiting_review']);
        $this->assertSame(1, $after['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertDatabaseMissing('teacher_recitation_reviews', ['ai_recite_attempt_id' => $legacy->id]);
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
        $this->assertSame(0, $overview['snapshot']['legacy_ai_only_unreviewed']);
        $this->assertSame(0, $overview['snapshot']['reviews_due_today']);
        $this->assertSame(0, $overview['snapshot']['submissions_awaiting_review']);
        $this->assertSame([], $overview['review_queue']['actionable']);
        $this->assertSame(0, $overview['hifz']['memorised_ayahs']);
        $this->assertSame(0, $overview['hifz']['unique_memorised_ayahs']);
        $this->assertSame('sum_of_student_ayahs', $overview['hifz']['counting']);
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
