<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherRecitationAssessment;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Learning\StudentAiFeedbackService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentAiFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_feedback_separates_uncertain_results_from_wording_differences(): void
    {
        $feedback = app(StudentAiFeedbackService::class)->interpret([
            'accuracy_percent' => 80,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
            'word_statuses' => [
                ['status' => 'correct', 'text' => 'قل', 'ayah_number' => 1],
                ['status' => 'uncertain', 'text' => 'هو', 'ayah_number' => 1],
                ['status' => 'wrong', 'text' => 'الله', 'ayah_number' => 1],
            ],
        ]);

        $this->assertFalse($feedback['is_tajweed']);
        $this->assertSame('ai_suggestion', $feedback['authority']);
        $this->assertSame('usable', $feedback['quality']);
        $this->assertSame(1, $feedback['wording']['matched']);
        $this->assertSame(1, $feedback['wording']['uncertain']);
        $this->assertSame(1, $feedback['wording']['mismatch']);
        $this->assertTrue($feedback['wording']['differences_reliable']);
        $this->assertSame('wording_difference', $feedback['practice']['reason']);
        $this->assertSame('revise', $feedback['practice']['tool']);
        $this->assertSame(112, $feedback['practice']['surah_number']);
        $this->assertSame(1, $feedback['practice']['ayah_start']);
        $this->assertNull($feedback['teacher_review']);

        $uncertainOnly = app(StudentAiFeedbackService::class)->interpret([
            'accuracy_percent' => 90,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 2, 'to' => 2],
            'word_statuses' => [
                ['status' => 'correct', 'text' => 'الله', 'ayah_number' => 2],
                ['status' => 'partial', 'text' => 'الصمد', 'ayah_number' => 2],
            ],
        ]);
        $this->assertSame(1, $uncertainOnly['wording']['uncertain']);
        $this->assertSame(0, $uncertainOnly['wording']['mismatch']);
        $this->assertSame('uncertain', $uncertainOnly['practice']['reason']);
    }

    public function test_invalid_and_low_quality_checks_do_not_become_repeated_ayahs(): void
    {
        $student = User::factory()->create(['account_role' => AccountRole::Student->value]);
        $session = $this->makeSession($student);
        $words = [
            ['status' => 'wrong', 'text' => 'قل', 'ayah_number' => 1],
            ['status' => 'uncertain', 'text' => 'هو', 'ayah_number' => 1],
        ];

        $this->attempt($student, $session, $words, [
            'band' => 'failed',
            'accuracy_percent' => null,
            'assessment_status' => MemorisationAssessment::STATUS_FAILED,
            'failure_reason' => 'audio_failed',
        ]);
        $this->attempt($student, $session, $words, [
            'band' => 'weak',
            'accuracy_percent' => 40,
            'audio_quality_status' => 'heavy_noise',
        ]);
        $this->attempt($student, $session, [
            ['status' => 'uncertain', 'text' => 'قل', 'ayah_number' => 1],
            ['status' => 'uncertain', 'text' => 'هو', 'ayah_number' => 1],
        ], [
            'band' => 'mixed',
            'accuracy_percent' => 70,
        ]);

        $revision = app(StudentAiFeedbackService::class)->repeatedAyahs($student);

        $this->assertSame('valid_historical_assessments', $revision['source']);
        $this->assertSame('ai_suggestion', $revision['authority']);
        $this->assertFalse($revision['is_tajweed']);
        $this->assertSame([], $revision['items']);

        $invalid = app(StudentAiFeedbackService::class)->interpret([
            'accuracy_percent' => 12,
            'band' => 'failed',
            'assessment_status' => MemorisationAssessment::STATUS_FAILED,
            'failure_reason' => 'audio_failed',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
            'word_statuses' => $words,
            'teacher_review' => [
                'teacher_name' => 'Ustadh Yusuf',
                'note' => 'This failed check must stay out.',
                'tajweed_score' => 4,
            ],
        ]);
        $this->assertFalse($invalid['valid']);
        $this->assertNull($invalid['wording']['percent']);
        $this->assertNull($invalid['wording']['mismatch']);
        $this->assertNull($invalid['practice']);
        $this->assertNull($invalid['teacher_review']);

        $low = app(StudentAiFeedbackService::class)->interpret([
            'accuracy_percent' => 40,
            'band' => 'weak',
            'audio_quality_status' => 'heavy_noise',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
            'session_id' => $session->id,
            'word_statuses' => $words,
        ]);
        $this->assertSame('low', $low['quality']);
        $this->assertFalse($low['wording']['differences_reliable']);
        $this->assertSame('recording', $low['practice']['reason']);
        $this->assertSame($session->id, $low['links']['session_id']);
    }

    public function test_repeated_ayahs_link_to_practice_and_keep_teacher_review_separate(): void
    {
        $this->enableTeacherFeatures();
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
        $session = $this->makeSession($student);
        $assignment = TeacherAssignment::factory()->create([
            'teacher_id' => $teacher->id,
            'organisation_id' => $organisation->id,
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 1,
        ]);
        $recipient = TeacherAssignmentRecipient::factory()->create([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
        ]);
        $words = [
            ['status' => 'wrong', 'text' => 'أحد', 'ayah_number' => 1],
            ['status' => 'correct', 'text' => 'قل', 'ayah_number' => 1],
        ];
        $first = $this->attempt($student, $session, $words, [
            'assignment_recipient_id' => $recipient->id,
            'accuracy_percent' => 70,
            'band' => 'weak',
        ]);
        $this->attempt($student, $session, $words, [
            'assignment_recipient_id' => $recipient->id,
            'accuracy_percent' => 75,
            'band' => 'mixed',
        ]);
        TeacherRecitationAssessment::query()->forceCreate([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'ai_recite_attempt_id' => $first->id,
            'tajweed_score' => 7,
            'annotation' => 'Lengthen the madd.',
        ]);

        $revision = app(StudentAiFeedbackService::class)->repeatedAyahs($student);
        $this->assertCount(1, $revision['items']);
        $item = $revision['items'][0];
        $this->assertSame(112, $item['surah_number']);
        $this->assertSame(1, $item['ayah_number']);
        $this->assertSame(2, $item['difference_attempts']);
        $this->assertSame('revise', $item['practice']['tool']);
        $this->assertSame(1, $item['practice']['ayah_start']);
        $this->assertSame($session->id, $item['session_id']);
        $this->assertSame($recipient->id, $item['assignment_recipient_id']);
        $this->assertArrayNotHasKey('tajweed_score', $item);

        $presented = app(StudentAiFeedbackService::class)->presentAttempt(
            $first->fresh(),
            $first->assessment,
            TeacherRecitationAssessment::query()->where('ai_recite_attempt_id', $first->id)->first(),
            $teacher->name,
        );
        $this->assertSame(70, $presented['wording']['percent']);
        $this->assertFalse($presented['is_tajweed']);
        $this->assertTrue($presented['teacher_review']['visible']);
        $this->assertSame('teacher', $presented['teacher_review']['authority']);
        $this->assertSame('Lengthen the madd.', $presented['teacher_review']['note']);
        $this->assertSame(7, $presented['teacher_review']['tajweed_score']);
        $this->assertTrue($presented['teacher_review']['is_tajweed']);
        $this->assertSame($recipient->id, $presented['links']['assignment_recipient_id']);
        $this->assertNotSame($presented['wording']['percent'], $presented['teacher_review']['tajweed_score']);

        $payload = $this->actingAs($student)->getJson(route('api.dashboard.progress'))->assertOk()->json();
        $this->assertSame(112, $payload['improve']['ai_revision']['items'][0]['surah_number']);
        $this->assertFalse($payload['improve']['ai_revision']['is_tajweed']);
        $this->assertSame('ai_suggestion', $payload['improve']['ai_revision']['authority']);
    }

    /**
     * @param  list<array<string, mixed>>  $words
     * @param  array<string, mixed>  $overrides
     */
    private function attempt(User $student, UserSession $session, array $words, array $overrides = []): AiReciteAttempt
    {
        $status = $overrides['assessment_status'] ?? MemorisationAssessment::STATUS_COMPLETED;
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $student->id,
            'user_session_id' => $session->id,
            'surah_number' => 112,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'status' => $status,
            'overall_accuracy' => $overrides['accuracy_percent'] ?? null,
            'failure_reason' => $overrides['failure_reason'] ?? null,
            'recognition_data' => [
                'calibration' => [
                    'audio_quality_status' => $overrides['audio_quality_status'] ?? 'clear',
                ],
            ],
        ]);

        return AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'memorisation_assessment_id' => $assessment->id,
            'user_session_id' => $session->id,
            'teacher_assignment_recipient_id' => $overrides['assignment_recipient_id'] ?? null,
            'attempt_number' => $assessment->id,
            'accuracy_percent' => $overrides['accuracy_percent'] ?? null,
            'band' => $overrides['band'] ?? 'mixed',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
            'word_statuses' => $words,
        ]);
    }

    private function makeSession(User $student): UserSession
    {
        return UserSession::query()->create([
            'user_id' => $student->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
        ]);
    }
}
