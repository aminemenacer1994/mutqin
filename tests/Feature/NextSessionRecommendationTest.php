<?php

namespace Tests\Feature;

use App\Enums\RecommendationReasonCode;
use App\Enums\RecommendationType;
use App\Models\MemorisationProgress;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserSession;
use App\Services\NextSessionRecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NextSessionRecommendationTest extends TestCase
{
    use RefreshDatabase;

    private function seedCompletedSession(User $user, int $surah, int $from, int $to, array $progressOverrides = []): UserSession
    {
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => $surah,
            'ayah_number' => $to,
            'current_step' => max(0, $to - $from),
            'memorisation_mode' => 'advanced',
            'repetitions_completed' => 3,
            'session_duration_seconds' => 600,
            'last_activity_at' => now(),
            'metadata' => [
                'active' => false,
                'completed' => true,
                'mode' => 'advanced',
                'config' => [
                    'chapterId' => $surah,
                    'rangeStart' => $from,
                    'rangeEnd' => $to,
                ],
            ],
        ]);

        for ($ayah = $from; $ayah <= $to; $ayah++) {
            $override = $progressOverrides[$ayah] ?? [];
            MemorisationProgress::create([
                'user_id' => $user->id,
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'status' => $override['status'] ?? 'memorised',
                'mastery_level' => $override['mastery_level'] ?? 85,
                'repetitions' => $override['repetitions'] ?? 5,
                'metadata' => $override['metadata'] ?? ['engine_status' => 'reviewed'],
                'completed_at' => now(),
            ]);
        }

        return $session;
    }

    public function test_recommendation_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/recommendations/next')->assertUnauthorized();
        $this->postJson('/api/recommendations/start', ['recommendation_id' => 1])->assertUnauthorized();
    }

    public function test_recommends_next_three_to_four_ayat_after_successful_completion(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);

        $response = $this->actingAs($user)->getJson('/api/recommendations/next');

        $response->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::Continue->value)
            ->assertJsonPath('recommendation.ayah_range.from', 5)
            ->assertJsonPath('recommendation.ayah_range.to', 8)
            ->assertJsonPath('recommendation.ayah_range.count', 4)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::StrongPreviousPerformance->value)
            ->assertJsonPath('recommendation.requires_confirmation', false)
            ->assertJsonPath('recommendation.is_end_of_surah', false);

        $this->assertDatabaseHas('session_recommendations', [
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_start' => 5,
            'ayah_end' => 8,
            'recommendation_type' => RecommendationType::Continue->value,
        ]);
    }

    public function test_recommends_fewer_ayat_when_reaching_end_of_surah(): void
    {
        $user = User::factory()->create();
        // Al-Fatihah has 7 ayat; completing 1-4 should recommend 5-7.
        $this->seedCompletedSession($user, 1, 1, 4);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::CompleteSurah->value)
            ->assertJsonPath('recommendation.ayah_range.from', 5)
            ->assertJsonPath('recommendation.ayah_range.to', 7)
            ->assertJsonPath('recommendation.ayah_range.count', 3)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::CompleteRemainingAyat->value);
    }

    public function test_completed_session_with_low_mastery_still_advances(): void
    {
        $user = User::factory()->create();
        // First-pass learning often leaves mastery low — that must not trap the learner.
        $this->seedCompletedSession($user, 1, 1, 3, [
            1 => ['status' => 'learning', 'mastery_level' => 20],
            2 => ['status' => 'learning', 'mastery_level' => 20],
            3 => ['status' => 'learning', 'mastery_level' => 20],
        ]);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::CompleteSurah->value)
            ->assertJsonPath('recommendation.ayah_range.from', 4)
            ->assertJsonPath('recommendation.ayah_range.to', 7);
    }

    public function test_recommends_revision_after_weak_performance(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 10, 13, [
            11 => [
                'status' => 'reviewing',
                'mastery_level' => 25,
                'metadata' => ['engine_status' => 'weak', 'weak_count' => 3],
            ],
            12 => [
                'status' => 'reviewing',
                'mastery_level' => 30,
                'metadata' => ['engine_status' => 'weak', 'weak_count' => 2],
            ],
        ]);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::Revision->value)
            ->assertJsonPath('recommendation.session_mode', 'revision')
            ->assertJsonPath('recommendation.ayah_range.from', 11)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::DifficultAyahDetected->value);
    }

    public function test_resumes_incomplete_session(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 18,
            'ayah_number' => 3,
            'current_step' => 2,
            'memorisation_mode' => 'advanced',
            'last_activity_at' => now(),
            'metadata' => [
                'active' => true,
                'completed' => false,
                'config' => [
                    'chapterId' => 18,
                    'rangeStart' => 1,
                    'rangeEnd' => 5,
                ],
            ],
        ]);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::Resume->value)
            ->assertJsonPath('recommendation.ayah_range.from', 4)
            ->assertJsonPath('recommendation.ayah_range.to', 5)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::ResumeIncompleteSession->value);
    }

    public function test_detects_surah_completion_and_requires_next_surah_confirmation(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 1, 1, 7);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::NextSurah->value)
            ->assertJsonPath('recommendation.is_end_of_surah', true)
            ->assertJsonPath('recommendation.requires_confirmation', true)
            ->assertJsonPath('recommendation.next_surah.id', 2)
            ->assertJsonPath('recommendation.surah.id', 2)
            ->assertJsonPath('recommendation.ayah_range.from', 1)
            ->assertJsonPath('recommendation.ayah_range.to', 4)
            ->assertJsonPath('recommendation.completed_surah.id', 1)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::SurahCompleted->value);
    }

    public function test_handles_final_surah_without_forcing_next(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 114, 1, 6);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::ManualSelection->value)
            ->assertJsonPath('recommendation.is_end_of_surah', true)
            ->assertJsonPath('recommendation.next_surah', null)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::LearningPlanComplete->value);
    }

    public function test_prevents_duplicate_open_recommendations(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);

        $first = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');
        $second = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, SessionRecommendation::where('user_id', $user->id)->count());
    }

    public function test_uses_latest_persisted_backend_data(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);

        // Later session supersedes the earlier one.
        $this->seedCompletedSession($user, 2, 20, 23);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.ayah_range.from', 24)
            ->assertJsonPath('recommendation.ayah_range.to', 27);
    }

    public function test_accepting_recommendation_starts_session_idempotently(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);

        $recommendationId = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->json('recommendation.id');

        $first = $this->actingAs($user)
            ->postJson('/api/recommendations/start', ['recommendation_id' => $recommendationId])
            ->assertOk()
            ->assertJsonPath('started', true)
            ->json();

        $second = $this->actingAs($user)
            ->postJson('/api/recommendations/start', ['recommendation_id' => $recommendationId])
            ->assertOk()
            ->assertJsonPath('started', true)
            ->json();

        $this->assertSame($first['session']['id'], $second['session']['id']);
        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
        $this->assertDatabaseHas('session_recommendations', [
            'id' => $recommendationId,
            'accepted' => 1,
            'started_session_id' => $first['session']['id'],
        ]);
        $this->assertSame(5, $first['session']['metadata']['config']['rangeStart']);
        $this->assertSame(8, $first['session']['metadata']['config']['rangeEnd']);
    }

    public function test_handles_users_with_no_previous_sessions(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::ManualSelection->value)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::ManualFallback->value)
            ->assertJsonPath('recommendation.ayah_range', null);
    }

    public function test_reject_marks_recommendation_as_chose_other(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);
        $id = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->actingAs($user)
            ->postJson('/api/recommendations/reject', [
                'recommendation_id' => $id,
                'chose_other' => true,
            ])
            ->assertOk()
            ->assertJsonPath('rejected', true);

        $this->assertDatabaseHas('session_recommendations', [
            'id' => $id,
            'accepted' => 0,
            'chose_other' => 1,
        ]);
    }

    public function test_service_does_not_overlap_with_completed_range_on_continue(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 5, 8);
        $service = app(NextSessionRecommendationService::class);

        $recommendation = $service->recommend($user);

        $this->assertSame(RecommendationType::Continue->value, $recommendation['type']);
        $this->assertSame(9, $recommendation['ayah_range']['from']);
        $this->assertGreaterThanOrEqual(9, $recommendation['ayah_range']['from']);
        $this->assertSame(12, $recommendation['ayah_range']['to']);
    }
}
