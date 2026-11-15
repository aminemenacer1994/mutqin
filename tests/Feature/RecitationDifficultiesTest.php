<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationWeakSpot;
use App\Models\MemorisationWeakSpotOccurrence;
use App\Models\Organisation;
use App\Models\User;
use App\Services\Memorisation\MemorisationHistoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecitationDifficultiesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableTeacherFeatures();
    }

    public function test_reliable_weaknesses_create_occurrences_and_recurring_state(): void
    {
        [$teacher, $student] = $this->classroom();
        $history = app(MemorisationHistoryService::class);

        $first = $this->assessment($student, 1);
        $history->upsertWeakSpots($student, $first, [
            'weak_words' => [[
                'ayah_number' => 1,
                'word_index' => 2,
                'status' => 'wrong',
                'severity' => 'red',
                'confidence' => 0.9,
                'text' => 'ٱلرَّحْمَٰنِ',
                'actual' => 'wrong',
                'type' => 'SUBSTITUTION',
            ]],
            'weak_ayahs' => [],
        ]);

        $spot = MemorisationWeakSpot::query()->where('user_id', $student->id)->first();
        $this->assertNotNull($spot);
        $this->assertSame(MemorisationWeakSpot::STATE_INSUFFICIENT, $spot->recurrenceState());
        $this->assertSame('substitution', $spot->mistake_kind);
        $this->assertSame(1, MemorisationWeakSpotOccurrence::query()->where('weak_spot_id', $spot->id)->count());

        $second = $this->assessment($student, 2);
        $history->upsertWeakSpots($student, $second, [
            'weak_words' => [[
                'ayah_number' => 1,
                'word_index' => 2,
                'status' => 'wrong',
                'severity' => 'red',
                'confidence' => 0.88,
                'text' => 'ٱلرَّحْمَٰنِ',
                'actual' => 'wrong',
                'type' => 'SUBSTITUTION',
            ]],
            'weak_ayahs' => [],
        ]);

        $spot->refresh();
        $this->assertSame(2, (int) $spot->affected_attempt_count);
        $this->assertSame(MemorisationWeakSpot::STATE_RECURRING, $spot->recurrenceState());
        $this->assertSame(2, MemorisationWeakSpotOccurrence::query()->where('weak_spot_id', $spot->id)->count());

        $list = $this->actingAs($teacher)
            ->getJson(route('api.teacher.students.recitation-difficulties.index', $student).'?state=recurring')
            ->assertOk()
            ->json();
        $this->assertSame(1, $list['summary']['recurring']);
        $this->assertCount(1, $list['data']);
        $this->assertSame('ai', $list['data'][0]['source']);
    }

    public function test_low_confidence_hard_errors_are_not_stored_as_new_spots(): void
    {
        [, $student] = $this->classroom();
        $history = app(MemorisationHistoryService::class);
        $assessment = $this->assessment($student, 1);

        $history->upsertWeakSpots($student, $assessment, [
            'weak_words' => [[
                'ayah_number' => 1,
                'word_index' => 1,
                'status' => 'wrong',
                'severity' => 'red',
                'confidence' => 0.4,
                'text' => 'ٱلْحَمْدُ',
            ]],
            'weak_ayahs' => [],
        ]);

        $this->assertSame(0, MemorisationWeakSpot::query()->where('user_id', $student->id)->count());
    }

    public function test_teacher_can_confirm_and_dismiss_without_changing_ai_attempt(): void
    {
        [$teacher, $student] = $this->classroom();
        $assessment = $this->assessment($student, 1);
        $attempt = AiReciteAttempt::query()->create([
            'user_id' => $student->id,
            'memorisation_assessment_id' => $assessment->id,
            'attempt_number' => 1,
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 1],
            'accuracy_percent' => 70,
            'band' => 'mixed',
            'word_statuses' => [['status' => 'wrong', 'ayah_number' => 1, 'ayah_word_index' => 0]],
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
        ]);

        $spot = MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'spot_type' => MemorisationWeakSpot::TYPE_WORD,
            'surah_number' => 1,
            'ayah_number' => 1,
            'word_index' => 0,
            'verse_key' => '1:1',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_WORD, 1, 1, 0),
            'severity' => 'high',
            'mistake_kind' => 'substitution',
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => 'stable',
            'affected_attempt_count' => 2,
            'first_identified_at' => now()->subDay(),
            'last_identified_at' => now(),
            'source_assessment_id' => $assessment->id,
            'last_assessment_id' => $assessment->id,
        ]);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.recitation-difficulties.review', [$student, $spot]), [
            'status' => 'confirmed',
            'note' => 'Needs sabqi focus',
        ])->assertOk()->assertJsonPath('difficulty.teacher_review.confirmed', true);

        $attempt->refresh();
        $this->assertSame('wrong', $attempt->word_statuses[0]['status']);

        $this->actingAs($teacher)->postJson(route('api.teacher.students.recitation-difficulties.review', [$student, $spot]), [
            'status' => 'dismissed',
        ])->assertOk()->assertJsonPath('difficulty.recurrence_state', 'resolved');

        $queue = $this->actingAs($teacher)
            ->getJson(route('api.teacher.recitation-difficulties.queue'))
            ->assertOk()
            ->json('data');
        $this->assertSame([], $queue);
    }

    public function test_other_teacher_cannot_review_student_difficulties(): void
    {
        [$teacher, $student] = $this->classroom();
        $otherOrg = Organisation::factory()->create();
        $otherTeacher = User::factory()->create([
            'account_role' => AccountRole::Teacher->value,
            'organisation_id' => $otherOrg->id,
        ]);

        $spot = MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'spot_type' => MemorisationWeakSpot::TYPE_AYAH,
            'surah_number' => 1,
            'ayah_number' => 2,
            'word_index' => null,
            'verse_key' => '1:2',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_AYAH, 1, 2, null),
            'severity' => 'moderate',
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => 'stable',
            'affected_attempt_count' => 3,
            'first_identified_at' => now()->subDays(2),
            'last_identified_at' => now(),
        ]);

        $this->actingAs($otherTeacher)
            ->postJson(route('api.teacher.students.recitation-difficulties.review', [$student, $spot]), [
                'status' => 'confirmed',
            ])
            ->assertNotFound();

        unset($teacher);
    }

    public function test_learner_support_includes_recitation_difficulties(): void
    {
        [, $student] = $this->classroom();
        MemorisationWeakSpot::query()->create([
            'user_id' => $student->id,
            'spot_type' => MemorisationWeakSpot::TYPE_WORD,
            'surah_number' => 1,
            'ayah_number' => 3,
            'word_index' => 1,
            'verse_key' => '1:3',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_WORD, 1, 3, 1),
            'severity' => 'high',
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => 'stable',
            'affected_attempt_count' => 2,
            'first_identified_at' => now()->subDay(),
            'last_identified_at' => now(),
            'metadata' => ['text' => 'ٱلرَّحِيمِ'],
        ]);

        $support = $this->actingAs($student)->getJson(route('api.me.support'))->assertOk()->json();
        $this->assertSame(1, $support['recitation_difficulties']['counts']['recurring']);
        $this->assertNotEmpty($support['recitation_difficulties']['items'][0]['practise_again']['href_params']);
    }

    private function assessment(User $student, int $number): MemorisationAssessment
    {
        return MemorisationAssessment::query()->create([
            'user_id' => $student->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 7,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 70 - $number,
            'attempt_number' => $number,
        ]);
    }

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
