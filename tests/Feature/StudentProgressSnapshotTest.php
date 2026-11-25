<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AssignmentStatus;
use App\Enums\TeacherNoteKind;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\ParentStudentLink;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\TeacherRecitationAssessment;
use App\Models\TeacherWordCoaching;
use App\Models\TeacherWordCoachingCorrection;
use App\Models\User;
use App\Services\Teacher\StudentHifzProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentProgressSnapshotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
    }

    public function test_snapshot_reuses_shared_counts_and_keeps_ai_wording_separate(): void
    {
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

        MemorisationProgress::query()->create([
            'user_id' => $student->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => 'memorised',
            'completed_at' => now(),
        ]);
        MemorisationProgress::query()->create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'memorised',
            'completed_at' => now(),
        ]);

        $completed = $this->assignment($teacher, $student, AssignmentStatus::Completed, now());
        $this->assignment($teacher, $student, AssignmentStatus::Pending, now()->subDay());

        $valid = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $completed->id,
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'attempt_number' => 1,
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
        ]);
        $this->attempt($student, [
            'teacher_assignment_recipient_id' => $completed->id,
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'attempt_number' => 1,
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
        ]);
        $this->attempt($student, [
            'teacher_assignment_recipient_id' => $completed->id,
            'accuracy_percent' => 92,
            'band' => 'strong',
            'attempt_number' => 2,
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
        ]);
        $invalid = $this->attempt($student, [
            'accuracy_percent' => null,
            'band' => 'failed',
            'attempt_number' => 3,
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
        ]);

        TeacherRecitationAssessment::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $valid->id,
            'tajweed_score' => 7,
            'annotation' => 'Lengthen the madd.',
        ]);
        TeacherRecitationAssessment::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $invalid->id,
            'tajweed_score' => 4,
            'annotation' => 'This failed check must stay out.',
        ]);

        MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'verse_key' => '112:1',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, 112, 1),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'severity' => 'high',
            'affected_attempt_count' => 2,
            'teacher_review_status' => MemorisationWeakSpot::REVIEW_CONFIRMED,
            'last_identified_at' => now(),
        ]);
        MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'surah_number' => 113,
            'ayah_number' => 1,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'verse_key' => '113:1',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, 113, 1),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'severity' => 'high',
            'affected_attempt_count' => 4,
            'teacher_review_status' => null,
            'last_identified_at' => now(),
        ]);

        $this->correction($teacher, $student, $valid, 1, 'Hold the qalqalah.');
        $second = $this->attempt($student, [
            'teacher_assignment_recipient_id' => $completed->id,
            'accuracy_percent' => 70,
            'band' => 'weak',
            'attempt_number' => 4,
            'ayah_range' => ['surah' => 112, 'from' => 2, 'to' => 2],
        ]);
        $this->correction($teacher, $student, $second, 1, 'Hold the qalqalah again.');

        TeacherNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $organisation->id,
            'teacher_assignment_id' => $completed->teacher_assignment_id,
            'kind' => TeacherNoteKind::Feedback->value,
            'body' => 'Reviewed and ready to continue.',
        ]);
        TeacherPrivateNote::factory()->create([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $organisation->id,
            'body' => 'Private coaching note',
        ]);

        $this->getJson(route('api.dashboard.progress'))->assertUnauthorized();

        $payload = $this->actingAs($student)
            ->getJson(route('api.dashboard.progress', ['window' => 'week']))
            ->assertOk()
            ->json();

        $this->assertSame('week', $payload['window']);
        $this->assertSame(7, $payload['period_days']);
        $this->assertSame(1, $payload['memorisation']['coverage']['memorised_ayahs']);
        $this->assertSame('memorisation_progress', $payload['memorisation']['coverage']['source']);
        $this->assertSame(1, $payload['memorisation']['newly_memorised_ayahs']);
        $this->assertSame(2, $payload['overview']['assignments']['due']);
        $this->assertSame(1, $payload['overview']['assignments']['completed']);
        $this->assertSame(1, $payload['overview']['assignments']['missed']);
        $this->assertSame(50, $payload['overview']['assignments']['completion_percent']);
        $this->assertSame('ai_word_match', $payload['recitation']['wording_match']['source']);
        $this->assertFalse($payload['recitation']['wording_match']['is_tajweed']);
        $this->assertSame(1, $payload['recitation']['wording_match']['comparable_passages']);
        $this->assertSame(1, $payload['recitation']['teacher_assessments']['count']);
        $this->assertSame(7, $payload['recitation']['teacher_assessments']['items'][0]['tajweed_score']);
        $this->assertTrue($payload['recitation']['teacher_assessments']['items'][0]['is_tajweed']);
        $this->assertArrayNotHasKey('accuracy_percent', $payload['recitation']['teacher_assessments']['items'][0]);
        $this->assertArrayNotHasKey('word_match_percent', $payload['recitation']['teacher_assessments']['items'][0]);
        $this->assertSame(112, $payload['improve']['weak_passages'][0]['surah_number']);
        $this->assertCount(1, $payload['improve']['weak_passages']);
        $this->assertCount(1, $payload['improve']['recurring_mistakes']);
        $this->assertGreaterThanOrEqual(2, $payload['improve']['recurring_mistakes'][0]['count']);
        $this->assertTrue($payload['improve']['recurring_mistakes'][0]['is_tajweed_assessment']);
        $this->assertStringNotContainsString('Private coaching note', json_encode($payload));
        $this->assertStringNotContainsString('This failed check must stay out.', json_encode($payload));
        $this->assertTrue(collect($payload['feedback'])->contains(fn (array $item) => $item['body'] === 'Reviewed and ready to continue.' && $item['recipient_id'] === $completed->id));

        $parent = User::factory()->create(['account_role' => AccountRole::Parent->value]);
        ParentStudentLink::factory()->approved()->create([
            'parent_user_id' => $parent->id,
            'student_user_id' => $student->id,
        ]);
        $parentProgress = $this->actingAs($parent)
            ->getJson(route('api.parent.children.progress', $student).'?window=week')
            ->assertOk()
            ->json();
        $this->assertSame($payload['memorisation']['coverage']['memorised_ayahs'], $parentProgress['coverage']['memorised_ayahs']);
        $this->assertSame($payload['overview']['assignments']['due'], $parentProgress['assignment_completion']['due']);
        $this->assertSame($payload['overview']['assignments']['completed'], $parentProgress['assignment_completion']['completed']);
        $this->assertSame($payload['recitation']['wording_match']['comparable_passages'], $parentProgress['wording_match']['comparable_passages']);
        $this->assertFalse($parentProgress['wording_match']['is_tajweed']);

        $empty = $this->actingAs($other)->getJson(route('api.dashboard.progress'))->assertOk()->json();
        $this->assertSame(1, $empty['memorisation']['coverage']['memorised_ayahs']);
        $this->assertSame(0, $empty['overview']['assignments']['due']);
        $this->assertNull($empty['overview']['assignments']['completion_percent']);
        $this->assertSame([], $empty['improve']['weak_passages']);
        $this->assertSame([], $empty['feedback']);
        $this->assertSame('month', $empty['window']);

        $direct = app(StudentHifzProgressService::class)->forLearner($student, 'week');
        $this->assertSame($payload['overview']['assignments'], $direct['overview']['assignments']);
    }

    private function assignment(User $teacher, User $student, AssignmentStatus $status, $due): TeacherAssignmentRecipient
    {
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'activity' => 'hifz',
            'hifz_category' => 'sabaq',
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 1,
            'due_at' => $due,
            'feedback' => 'Steady pace.',
        ]);

        return TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => $status->value,
            'completed_at' => $status === AssignmentStatus::Completed ? now() : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function attempt(User $student, array $overrides = []): AiReciteAttempt
    {
        return AiReciteAttempt::query()->create(array_merge([
            'user_id' => $student->id,
            'attempt_number' => 1,
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
            'accuracy_percent' => 80,
            'band' => 'mixed',
        ], $overrides));
    }

    private function correction(User $teacher, User $student, AiReciteAttempt $attempt, int $word, string $body): void
    {
        $coaching = new TeacherWordCoaching;
        $coaching->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $attempt->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'word_index' => $word,
            'ai_status' => 'mismatch',
            'review_status' => TeacherWordCoaching::OPEN,
        ])->save();

        $correction = new TeacherWordCoachingCorrection;
        $correction->forceFill([
            'teacher_word_coaching_id' => $coaching->id,
            'teacher_id' => $teacher->id,
            'body' => $body,
            'focus' => 'qalqalah',
            'finding' => 'difficulty',
        ])->save();
    }
}
