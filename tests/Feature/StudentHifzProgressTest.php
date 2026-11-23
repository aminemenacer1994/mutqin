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
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\RevisionRecommendation;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Support\QuranMetadata;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentHifzProgressTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_coverage_uses_validated_progress_and_keeps_wording_separate(): void
    {
        [$teacher, $student] = $this->classroom();
        $this->progress($student, 112, 1, 'memorised', ['last_review_at' => now()->subDays(2)->toIso8601String()]);
        $this->progress($student, 112, 2, 'memorised', ['last_review_at' => now()->subDays(2)->toIso8601String()]);
        $this->progress($student, 112, 3, 'memorised', ['last_review_at' => now()->subDays(40)->toIso8601String()]);
        $this->progress($student, 112, 4, 'learning');
        $this->progress($student, 113, 1, 'reviewing');

        $spot = MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'surah_number' => 112,
            'ayah_number' => 3,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'verse_key' => '112:3',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, 112, 3),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'severity' => 'high',
            'affected_attempt_count' => 3,
            'teacher_review_status' => MemorisationWeakSpot::REVIEW_CONFIRMED,
            'last_identified_at' => now(),
        ]);
        $this->assertNotNull($spot);

        $profile = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertOk()->json();
        $hifz = $profile['meta']['hifz'];
        $coverage = $hifz['coverage'];

        $this->assertSame(3, $coverage['memorised_ayahs']);
        $this->assertSame('memorisation_progress', $coverage['source']);
        $this->assertSame(0, $hifz['validated_memorisation']['validated_ayahs']);
        $this->assertSame('teacher_approved_assignments', $hifz['validated_memorisation']['source']);
        $this->assertSame('ai_word_match', $hifz['wording_match']['source']);
        $this->assertFalse($hifz['wording_match']['is_tajweed']);
        $this->assertSame(1, $coverage['learning_ayahs']);
        $this->assertSame(1, $coverage['reviewing_ayahs']);
        $this->assertSame(QuranMetadata::totalAyahCount(), $coverage['mushaf_ayahs']);
        $this->assertEquals(round(100 * 3 / QuranMetadata::totalAyahCount(), 1), $coverage['coverage_percent']);
        $this->assertSame(1, $coverage['ranges']['total']);
        $this->assertSame(1, $coverage['ranges']['items'][0]['ayah_start']);
        $this->assertSame(3, $coverage['ranges']['items'][0]['ayah_end']);
        $this->assertNotEmpty($coverage['ranges']['items'][0]['last_reviewed_at']);
        $this->assertSame(2, $coverage['recent_revision']['ayahs']);
        $this->assertSame(1, $coverage['older_revision']['ayahs']);
        $this->assertSame(1, $coverage['new_memorisation']['ayahs']);
        $this->assertLessThan(1, $coverage['coverage_percent']);
        $this->assertSame('teacher_confirmed', $hifz['next']['source']);
        $this->assertSame('manzil', $hifz['next']['hifz_category']);
        $this->assertSame(112, $hifz['weak_passages'][0]['surah_number']);
        $this->assertArrayNotHasKey('rows', $coverage);

        $report = $this->actingAs($teacher)->getJson(route('api.teacher.students.report', [
            'student' => $student,
            'from' => now()->subDays(6)->toDateString(),
            'to' => now()->toDateString(),
        ]))->assertOk()->json();
        $this->assertFalse($report['hifz']['wording']['is_tajweed']);
        $this->assertSame('insufficient', $report['hifz']['wording']['direction']);
        $this->assertSame(3, $report['hifz']['coverage']['memorised_ayahs']);
        $this->assertSame(2, $report['hifz']['revision']['reviewed_ayahs']);
        $this->assertSame(3, $report['hifz']['revision']['memorised_ayahs']);

        $overview = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json();
        $this->assertSame(3, $overview['hifz']['memorised_ayahs']);
        $this->assertSame(3, $overview['hifz']['unique_memorised_ayahs']);
        $this->assertSame('sum_of_student_ayahs', $overview['hifz']['counting']);
        $this->assertSame(1, $overview['hifz']['students_with_memorised_ayahs']);

        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => 'ai_recite',
            'activity' => 'hifz',
            'hifz_category' => 'sabaq',
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 2,
        ]);
        TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::Completed->value,
            'completed_at' => now(),
        ]);

        $validated = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.show', $student))
            ->assertOk()
            ->json('meta.hifz.validated_memorisation');
        $this->assertSame(2, $validated['validated_ayahs']);
        $this->assertSame(1, $validated['ranges']['total']);
        $this->assertNotNull($validated['last_validated_at']);
    }

    public function test_snoozing_a_recommendation_does_not_assign_it(): void
    {
        [$teacher, $student] = $this->classroom();
        $this->progress($student, 1, 1, 'memorised', ['last_review_at' => now()->subDays(3)->toIso8601String()]);
        $row = RevisionRecommendation::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'status' => 'pending',
            'activity' => 'revision',
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 1,
            'reason_code' => 'teacher_confirmed_difficulty',
            'reason' => 'Teacher confirmed this ayah needs more practice.',
            'source_key' => 'phase4-snooze',
            'evidence' => ['kind' => 'teacher_confirmed_difficulty', 'is_tajweed_assessment' => false],
        ]);
        $due = now()->addDays(7)->toDateString();

        $saved = $this->actingAs($teacher)
            ->patchJson(route('api.teacher.revision-recommendations.update', $row), ['due_on' => $due])
            ->assertOk()
            ->json('recommendation');

        $this->assertSame($due, $saved['due_on']);
        $this->assertSame('pending', $saved['status']);
        $this->assertNull($saved['teacher_assignment_id']);
        $this->assertTrue($saved['teacher_confirmed']);
        $this->assertNotNull($saved['last_reviewed_at']);
        $this->assertSame(0, TeacherAssignment::query()->count());
    }

    public function test_overlapping_progress_is_counted_once_and_assignments_do_not_memorise(): void
    {
        [$teacher, $student] = $this->classroom();
        $this->progress($student, 112, 1, 'memorised', ['last_review_at' => now()->subDays(2)->toIso8601String()]);
        $this->progress($student, 112, 2, 'memorised');
        $this->task($teacher, $student, now()->addDay(), AssignmentStatus::Pending);
        AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'attempt_number' => 1,
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 4],
            'accuracy_percent' => 99,
            'band' => 'strong',
        ]);

        $coverage = $this->actingAs($teacher)->getJson(route('api.teacher.students.show', $student))->assertOk()->json('meta.hifz.coverage');
        $this->assertSame(2, $coverage['memorised_ayahs']);
        $this->assertSame(1, $coverage['recent_revision']['ayahs']);
        $this->assertSame(0, $coverage['older_revision']['ayahs']);

        $peer = User::factory()->create([
            'account_role' => AccountRole::Student->value,
            'organisation_id' => $student->organisation_id,
        ]);
        $groupId = GroupMembership::query()->where('user_id', $student->id)->value('learning_group_id');
        GroupMembership::factory()->create([
            'learning_group_id' => $groupId,
            'user_id' => $peer->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $peer->id,
        ]);
        $this->progress($peer, 112, 1, 'memorised', ['last_review_at' => now()->subDays(40)->toIso8601String()]);

        $class = $this->actingAs($teacher)->getJson(route('api.teacher.overview'))->assertOk()->json('hifz');
        $this->assertSame(3, $class['memorised_ayahs']);
        $this->assertSame(2, $class['unique_memorised_ayahs']);
    }

    public function test_lesson_denominator_counts_only_tasks_due_in_the_period(): void
    {
        [$teacher, $student] = $this->classroom();
        $due = $this->task($teacher, $student, now()->subDay(), AssignmentStatus::Completed);
        $missed = $this->task($teacher, $student, now()->subDay(), AssignmentStatus::Overdue);
        $this->task($teacher, $student, now()->addDays(10), AssignmentStatus::Pending);
        $this->assertNotNull($due);
        $this->assertNotNull($missed);

        $report = $this->actingAs($teacher)->getJson(route('api.teacher.students.report', [
            'student' => $student,
            'from' => now()->subDays(6)->toDateString(),
            'to' => now()->toDateString(),
        ]))->assertOk()->json('hifz.tasks');

        $this->assertSame(2, $report['due']);
        $this->assertSame(1, $report['completed']);
        $this->assertSame(1, $report['missed']);
        $this->assertSame(50, $report['completion_percent']);
        $this->assertSame('tasks_due', $report['denominator']);
    }

    public function test_duplicate_plan_activity_is_rejected_and_stage_can_overlap(): void
    {
        [$teacher, $student] = $this->classroom();
        $due = now()->addDays(2)->toDateString();
        $item = [
            'activity' => 'revision',
            'kind' => 'practice',
            'hifz_category' => 'manzil',
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'due_on' => $due,
            'origin' => 'assigned',
        ];

        $plan = $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Ikhlas revision',
            'cadence' => 'weekly',
            'items' => [$item],
        ])->assertCreated()->json('plan');

        $this->assertSame('manzil', $plan['items'][0]['hifz_category']);
        $this->assertSame('revision', $plan['items'][0]['activity']);

        $this->actingAs($teacher)->postJson(route('api.teacher.learning-plans.store'), [
            'student_id' => $student->id,
            'title' => 'Ikhlas revision again',
            'cadence' => 'weekly',
            'items' => [$item, $item],
        ])->assertStatus(422);

        $this->assertDatabaseCount('learning_plans', 1);
    }

    public function test_reflection_stays_unverified_and_notes_keep_a_priority_category(): void
    {
        [$teacher, $student] = $this->classroom();

        $this->actingAs($student)->postJson(route('api.me.self-assessments.store'), [
            'feeling' => 'difficult',
            'confidence' => 'low',
            'difficult_ayahs' => '112:2',
            'wants_revision' => true,
            'note' => 'The second ayah',
        ])->assertOk()
            ->assertJsonPath('self_assessment.verified_mistake', false)
            ->assertJsonPath('self_assessment.confidence', 'low')
            ->assertJsonPath('self_assessment.wants_revision', true);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.private-notes.store', $student), [
            'category' => 'next_priorities',
            'body' => 'Start with ayah 2.',
        ])->assertCreated()
            ->assertJsonPath('note.category', 'next_priorities')
            ->assertJsonPath('note.author.id', $teacher->id);

        $this->actingAs($student)->getJson(route('api.teacher.students.private-notes.index', $student))->assertForbidden();
    }

    private function progress(User $student, int $surah, int $ayah, string $status, array $metadata = []): void
    {
        MemorisationProgress::query()->create([
            'user_id' => $student->id,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'status' => $status,
            'mastery_level' => $status === 'memorised' ? 4 : 1,
            'repetitions' => 2,
            'metadata' => $metadata,
            'completed_at' => $status === 'memorised' ? now()->subDays(3) : null,
        ]);
    }

    private function task(User $teacher, User $student, $due, AssignmentStatus $status): TeacherAssignmentRecipient
    {
        $assignment = new TeacherAssignment;
        $assignment->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => 'practice',
            'activity' => 'revision',
            'hifz_category' => 'sabqi',
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'due_at' => $due,
        ])->save();

        $recipient = new TeacherAssignmentRecipient;
        $recipient->forceFill([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => $status->value,
            'completed_at' => $status === AssignmentStatus::Completed ? now() : null,
        ])->save();

        return $recipient;
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
