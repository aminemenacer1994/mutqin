<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\HifzExaminationAttempt;
use App\Models\HifzExaminationQuestion;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Support\QuranRangeResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HifzExaminationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_teacher_can_create_examination_assignment(): void
    {
        [$teacher, $student] = $this->classroom();

        $response = $this->actingAs($teacher)->postJson(route('api.teacher.assignments.store'), [
            'kind' => 'practice',
            'activity' => 'examination',
            'hifz_category' => 'manzil',
            'student_id' => $student->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'repetition_target' => 1,
            'due_at' => today()->addDays(3)->toDateString(),
            'session_settings' => [
                'examination' => [
                    'enabled' => true,
                    'pool_type' => 'custom',
                    'generation_mode' => 'random',
                    'question_count' => 3,
                    'recitation_length_ayahs' => 2,
                    'delivery' => 'live',
                ],
            ],
        ])->assertCreated();

        $assignmentId = (int) $response->json('assignment.id');
        $assignment = TeacherAssignment::query()->findOrFail($assignmentId);
        $this->assertSame('examination', $assignment->activity);
        $this->assertNotEmpty($assignment->session_settings['examination'] ?? null);
    }

    public function test_examination_questions_persist_per_recipient_and_do_not_reshuffle(): void
    {
        [$teacher, $student] = $this->classroom();
        $recipient = $this->createExaminationRecipient($teacher, $student);

        $first = $this->actingAs($student)
            ->getJson(route('api.me.assignments.examination.show', ['recipient' => $recipient->id]))
            ->assertOk()
            ->json('examination');

        $second = $this->actingAs($student)
            ->getJson(route('api.me.assignments.examination.show', ['recipient' => $recipient->id]))
            ->assertOk()
            ->json('examination');

        $this->assertCount(3, $first['questions']);
        $this->assertSame(
            array_column($first['questions'], 'id'),
            array_column($second['questions'], 'id'),
        );

        $attempt = HifzExaminationAttempt::query()->where('teacher_assignment_recipient_id', $recipient->id)->first();
        $this->assertNotNull($attempt);
        $this->assertSame(3, HifzExaminationQuestion::query()->where('hifz_examination_attempt_id', $attempt->id)->count());
    }

    public function test_juz_pool_resolves_verified_ayah_boundaries(): void
    {
        $pool = QuranRangeResolver::expandJuzRange(1, 1);
        $this->assertNotEmpty($pool);
        $this->assertSame('1:1', $pool[0]['key']);
        $this->assertGreaterThan(100, count($pool));
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

    private function createExaminationRecipient(User $teacher, User $student): TeacherAssignmentRecipient
    {
        $assignment = new TeacherAssignment;
        $assignment->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => 'practice',
            'hifz_category' => 'manzil',
            'activity' => 'examination',
            'recording_required' => false,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'repetition_target' => 1,
            'due_at' => today()->addDay(),
            'session_settings' => [
                'examination' => [
                    'enabled' => true,
                    'pool_type' => 'custom',
                    'generation_mode' => 'random',
                    'question_count' => 3,
                    'recitation_length_ayahs' => 2,
                    'exam_modes' => ['continue_recitation'],
                    'delivery' => 'live',
                ],
            ],
        ])->save();

        $recipient = new TeacherAssignmentRecipient;
        $recipient->forceFill([
            'teacher_assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'status' => AssignmentStatus::InProgress->value,
        ])->save();

        return $recipient;
    }
}