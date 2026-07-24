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
            'status' => 'completed',
            'repetitions_completed' => 3,
            'session_duration_seconds' => 600,
            'last_activity_at' => now(),
            'ended_at' => now(),
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

    public function test_recommends_workload_balanced_next_range_after_successful_completion(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);

        $response = $this->actingAs($user)->getJson('/api/recommendations/next');

        $response->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::Continue->value)
            ->assertJsonPath('recommendation.ayah_range.from', 5)
            ->assertJsonPath('recommendation.ayah_range.to', 7)
            ->assertJsonPath('recommendation.ayah_range.count', 3)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::StrongPreviousPerformance->value)
            ->assertJsonPath('recommendation.requires_confirmation', false)
            ->assertJsonPath('recommendation.is_end_of_surah', false)
            ->assertJsonPath('recommendation.panel_title_key', 'nextSetTitle');

        $this->assertNotNull(data_get($response->json(), 'recommendation.workload.score'));
        $this->assertDatabaseHas('session_recommendations', [
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_start' => 5,
            'ayah_end' => 7,
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
            ->assertJsonPath('recommendation.type', RecommendationType::Continue->value)
            ->assertJsonPath('recommendation.ayah_range.from', 4)
            ->assertJsonPath('recommendation.ayah_range.to', 6);
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

        $response = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::NextSurah->value)
            ->assertJsonPath('recommendation.is_end_of_surah', true)
            ->assertJsonPath('recommendation.requires_confirmation', true)
            ->assertJsonPath('recommendation.next_surah.id', 114)
            ->assertJsonPath('recommendation.surah.id', 114)
            ->assertJsonPath('recommendation.ayah_range.from', 1)
            ->assertJsonPath('recommendation.completed_surah.id', 1)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::SurahCompleted->value)
            ->json('recommendation');

        $this->assertGreaterThanOrEqual(1, (int) ($response['ayah_range']['to'] ?? 0));
        $this->assertLessThanOrEqual(3, (int) ($response['ayah_range']['to'] ?? 0));
        $this->assertLessThanOrEqual(3, (int) ($response['ayah_range']['count'] ?? 0));
    }

    public function test_after_an_nas_continues_juz_amma_with_small_opening(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 114, 1, 6);

        $response = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::NextSurah->value)
            ->assertJsonPath('recommendation.is_end_of_surah', true)
            ->assertJsonPath('recommendation.next_surah.id', 113)
            ->assertJsonPath('recommendation.surah.id', 113)
            ->assertJsonPath('recommendation.completed_surah.id', 114)
            ->assertJsonPath('recommendation.ayah_range.from', 1)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::SurahCompleted->value)
            ->json('recommendation');

        // Adaptive bite — never dump the whole next surah.
        $this->assertLessThanOrEqual(5, (int) ($response['ayah_range']['to'] ?? 0));
        $this->assertLessThanOrEqual(5, (int) ($response['ayah_range']['count'] ?? 99));
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
            ->assertJsonPath('recommendation.ayah_range.to', 25);
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
        // Completed source session remains immutable; accepting creates a new active session.
        $this->assertSame(2, UserSession::where('user_id', $user->id)->count());
        $this->assertDatabaseHas('user_sessions', [
            'id' => $first['session']['id'],
            'status' => 'active',
            'recommendation_id' => $recommendationId,
        ]);
        $completed = UserSession::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->first();
        $this->assertNotNull($completed);
        $this->assertSame(2, (int) $completed->surah_number);
        $this->assertDatabaseHas('session_recommendations', [
            'id' => $recommendationId,
            'accepted' => 1,
            'started_session_id' => $first['session']['id'],
        ]);
        $this->assertSame(5, $first['session']['metadata']['config']['rangeStart']);
        $this->assertSame(7, $first['session']['metadata']['config']['rangeEnd']);
    }

    public function test_confidence_needs_practice_supersedes_with_repeat(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 12, 14);

        $recommendationId = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->json('recommendation.id');

        $response = $this->actingAs($user)
            ->postJson('/api/recommendations/confidence', [
                'recommendation_id' => $recommendationId,
                'confidence' => 'needs_practice',
            ])
            ->assertOk()
            ->json('recommendation');

        $this->assertSame(RecommendationType::RepeatCurrentRange->value, $response['type']);
        $this->assertSame(12, $response['ayah_range']['from']);
        $this->assertSame(14, $response['ayah_range']['to']);
        $this->assertSame('repeated', $response['range_kind']);
        $this->assertSame('revisionSetTitle', $response['panel_title_key']);
        $this->assertNotEmpty($response['adaptation_explanations'] ?? []);
        $this->assertContains('repeat_range', $response['available_actions'] ?? []);
        $this->assertGreaterThanOrEqual(3, (int) ($response['settings']['repetitions'] ?? 0));
        $this->assertLessThanOrEqual(1.0, (float) ($response['settings']['playback_speed'] ?? 1));
        $this->assertDatabaseHas('session_recommendations', [
            'id' => $recommendationId,
            'status' => 'superseded',
        ]);
    }

    public function test_confidence_confident_upgrades_repeat_to_continue(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 12, 14);

        $recommendationId = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->json('recommendation.id');

        $repeatId = $this->actingAs($user)
            ->postJson('/api/recommendations/confidence', [
                'recommendation_id' => $recommendationId,
                'confidence' => 'needs_practice',
            ])
            ->assertOk()
            ->json('recommendation.id');

        $upgraded = $this->actingAs($user)
            ->postJson('/api/recommendations/confidence', [
                'recommendation_id' => $repeatId,
                'confidence' => 'confident',
            ])
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::Continue->value)
            ->assertJsonPath('recommendation.ayah_range.from', 15)
            ->assertJsonPath('recommendation.ayah_range.to', 17)
            ->assertJsonPath('recommendation.reason_code', RecommendationReasonCode::ConfidenceConfident->value)
            ->json('recommendation');

        $why = (string) ($upgraded['user_reason'] ?? $upgraded['reason'] ?? '');
        $this->assertNotEmpty($why);
        $this->assertStringNotContainsStringIgnoringCase('score', $why);
        $this->assertStringNotContainsStringIgnoringCase('mastery', $why);
    }

    public function test_settings_overrides_apply_only_on_accept(): void
    {
        $user = User::factory()->create();
        $completed = $this->seedCompletedSession($user, 2, 12, 14);
        $completedSettings = $completed->fresh()->completion_settings;

        $recommendationId = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->json('recommendation.id');

        $this->actingAs($user)
            ->postJson('/api/recommendations/settings', [
                'recommendation_id' => $recommendationId,
                'settings' => [
                    'playback_speed' => 0.75,
                    'repetitions' => 5,
                    'technique' => 'talqin',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('recommendation.settings.playback_speed', 0.75)
            ->assertJsonPath('recommendation.settings.repetitions', 5);

        $started = $this->actingAs($user)
            ->postJson('/api/recommendations/start', [
                'recommendation_id' => $recommendationId,
            ])
            ->assertOk()
            ->json('session');

        $this->assertSame(0.75, (float) data_get($started, 'metadata.config.playbackSpeed'));
        $this->assertSame(5, (int) data_get($started, 'metadata.config.repetitionsPerStep'));
        $this->assertSame(
            $completedSettings,
            UserSession::query()->find($completed->id)?->completion_settings,
            'Completed session settings must remain immutable'
        );
    }

    public function test_end_session_returns_recommendation_idempotently(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 14,
            'status' => 'active',
            'last_activity_at' => now(),
            'started_at' => now(),
            'metadata' => [
                'active' => true,
                'completed' => false,
                'config' => [
                    'chapterId' => 2,
                    'rangeStart' => 12,
                    'rangeEnd' => 14,
                    'reciterId' => 'ar.alafasy',
                    'playbackSpeed' => 1,
                    'repetitionsPerStep' => 3,
                    'talqinModeEnabled' => true,
                ],
            ],
        ]);

        for ($ayah = 12; $ayah <= 14; $ayah++) {
            MemorisationProgress::create([
                'user_id' => $user->id,
                'surah_number' => 2,
                'ayah_number' => $ayah,
                'status' => 'memorised',
                'mastery_level' => 80,
                'repetitions' => 3,
                'metadata' => ['engine_status' => 'reviewed'],
                'completed_at' => now(),
            ]);
        }

        $first = $this->actingAs($user)
            ->postJson('/api/session/end', [
                'metadata' => [
                    'active' => false,
                    'completed' => true,
                    'config' => [
                        'chapterId' => 2,
                        'rangeStart' => 12,
                        'rangeEnd' => 14,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->json();

        $this->assertNotNull($first['recommendation']['id'] ?? null);
        $this->assertSame(15, $first['recommendation']['ayah_range']['from']);
        $this->assertSame(17, $first['recommendation']['ayah_range']['to']);

        $second = $this->actingAs($user)
            ->postJson('/api/session/end', [])
            ->assertOk()
            ->json();

        $this->assertSame($first['session']['id'], $second['session']['id']);
        $this->assertSame($first['recommendation']['id'], $second['recommendation']['id']);
        $this->assertSame(1, SessionRecommendation::where('user_id', $user->id)->count());
    }

    public function test_ai_assessment_weak_recommends_repeat(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 12, 14);
        $recommendationId = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->actingAs($user)
            ->postJson('/api/recommendations/ai-assessment', [
                'recommendation_id' => $recommendationId,
                'result' => 'weak',
                'summary' => 'A little more practice will help',
            ])
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::RepeatCurrentRange->value)
            ->assertJsonPath('recommendation.ayah_range.from', 12)
            ->assertJsonPath('recommendation.ayah_range.to', 14);
    }

    public function test_adaptive_assessment_snapshot_reshapes_plan(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 12, 14);
        $recommendationId = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $response = $this->actingAs($user)
            ->postJson('/api/recommendations/adaptive-assessment', [
                'recommendation_id' => $recommendationId,
                'result' => 'weak',
                'summary' => 'Sequence needs support',
                'reason_codes' => ['sequence_errors', 'low_recall'],
                'weak_ayahs' => [13],
                'skills' => [
                    'phraseRecall' => 0.3,
                    'ayahSequence' => 0.25,
                ],
                'snapshot' => [
                    'assessment_id' => 'assess_test',
                    'result' => 'weak',
                    'reason_codes' => ['sequence_errors'],
                    'skills' => ['phraseRecall' => 0.3, 'ayahSequence' => 0.25],
                    'policy' => [
                        'goal' => 'reinforce',
                        'primary_action' => 'start_focused_review',
                    ],
                ],
                'ayah_range' => ['from' => 12, 'to' => 14, 'count' => 3, 'focus_ayahs' => [13]],
                'focus_ayahs' => [13],
                'plan_detail' => [
                    'source' => 'quiz',
                    'personalWhy' => 'Verse 13 still feels tricky.',
                    'estimated_minutes' => 8,
                    'focus_ayahs' => [13],
                    'range' => [
                        'from' => 12,
                        'to' => 14,
                        'focusAyahs' => [13],
                        'label' => 'Al-Baqarah · Ayahs 12–14',
                    ],
                    'time' => ['minutes' => 8, 'label' => 'About 8 minutes'],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::RepeatCurrentRange->value)
            ->assertJsonPath('recommendation.ayah_range.from', 12)
            ->assertJsonPath('recommendation.ayah_range.to', 14)
            ->assertJsonPath('recommendation.ayah_range.focus_ayahs.0', 13)
            ->assertJsonPath('recommendation.plan_detail.estimated_minutes', 8)
            ->assertJsonPath('recommendation.plan_detail.focus_ayahs.0', 13)
            ->assertJsonPath('recommendation.adaptive_assessment.assessment_id', 'assess_test')
            ->assertJsonPath('recommendation.ai_assessment.adaptive', true)
            ->assertJsonPath('recommendation.ai_assessment.result', 'weak');
    }

    public function test_ai_assessment_persists_focused_plan_detail(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 12, 14);
        $recommendationId = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->actingAs($user)
            ->postJson('/api/recommendations/ai-assessment', [
                'recommendation_id' => $recommendationId,
                'result' => 'weak',
                'summary' => 'Verse 13 needs another pass',
                'weak_ayahs' => [13],
                'color_counts' => [
                    'green' => 8,
                    'amber' => 2,
                    'red' => 1,
                    'black' => 1,
                    'gray' => 0,
                ],
                'ayah_range' => ['from' => 12, 'to' => 14, 'count' => 3],
                'focus_ayahs' => [13],
                'plan_detail' => [
                    'source' => 'ai',
                    'estimated_minutes' => 7,
                    'focus_ayahs' => [13],
                    'personalWhy' => 'Verse 13 needs another pass.',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('recommendation.ai_assessment.color_counts.black', 1)
            ->assertJsonPath('recommendation.ai_assessment.color_counts.red', 1)
            ->assertJsonPath('recommendation.type', RecommendationType::RepeatCurrentRange->value)
            ->assertJsonPath('recommendation.ayah_range.focus_ayahs.0', 13)
            ->assertJsonPath('recommendation.plan_detail.estimated_minutes', 7);
    }

    public function test_cannot_accept_another_users_recommendation(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $this->seedCompletedSession($owner, 2, 1, 4);
        $id = $this->actingAs($owner)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->actingAs($other)
            ->postJson('/api/recommendations/start', ['recommendation_id' => $id])
            ->assertNotFound();
    }

    public function test_stale_dismissed_recommendation_cannot_start(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);
        $id = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->actingAs($user)
            ->postJson('/api/recommendations/reject', ['recommendation_id' => $id])
            ->assertOk();

        $this->actingAs($user)
            ->postJson('/api/recommendations/start', ['recommendation_id' => $id])
            ->assertStatus(422);
    }

    public function test_stale_superseded_recommendation_id_still_updates_and_starts(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 12, 14);

        $staleId = $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->json('recommendation.id');

        $repeat = $this->actingAs($user)
            ->postJson('/api/recommendations/confidence', [
                'recommendation_id' => $staleId,
                'confidence' => 'needs_practice',
            ])
            ->assertOk()
            ->json('recommendation');

        $this->assertNotSame($staleId, $repeat['id']);
        $this->assertSame(RecommendationType::RepeatCurrentRange->value, $repeat['type']);
        $this->assertDatabaseHas('session_recommendations', [
            'id' => $staleId,
            'status' => 'superseded',
        ]);

        // Client still holding the superseded id should resolve to the open repeat.
        $upgraded = $this->actingAs($user)
            ->postJson('/api/recommendations/confidence', [
                'recommendation_id' => $staleId,
                'confidence' => 'confident',
            ])
            ->assertOk()
            ->json('recommendation');

        $this->assertSame(RecommendationType::Continue->value, $upgraded['type']);
        $this->assertNotSame($staleId, $upgraded['id']);
        $this->assertNotSame($repeat['id'], $upgraded['id']);
        $this->assertDatabaseHas('session_recommendations', [
            'id' => $repeat['id'],
            'status' => 'superseded',
        ]);
        $this->assertDatabaseHas('session_recommendations', [
            'id' => $upgraded['id'],
            'status' => 'generated',
        ]);

        // Starting with the first superseded id must still reach the latest open continue.
        $started = $this->actingAs($user)
            ->postJson('/api/recommendations/start', [
                'recommendation_id' => $staleId,
                'settings' => array_merge($upgraded['settings'] ?? [], [
                    'adaptations' => ['increase_repetitions'],
                    'reason_code' => 'reinforce_recent_range',
                    'playback_speed' => '0.75',
                    'repetitions' => '5',
                ]),
            ])
            ->assertOk()
            ->assertJsonPath('started', true)
            ->json();

        $this->assertSame($upgraded['id'], (int) data_get($started, 'recommendation.id'));
    }

    public function test_start_ignores_extra_settings_keys(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 1, 4);
        $id = $this->actingAs($user)->getJson('/api/recommendations/next')->json('recommendation.id');

        $this->actingAs($user)
            ->postJson('/api/recommendations/start', [
                'recommendation_id' => $id,
                'settings' => [
                    'technique' => 'talqin',
                    'playback_speed' => 1,
                    'repetitions' => 3,
                    'adaptations' => ['use_talqin'],
                    'reason_code' => 'continue_while_fresh',
                    'unknown_flag' => true,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('started', true);
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
        $this->assertGreaterThanOrEqual(9, $recommendation['ayah_range']['to']);
        $this->assertLessThanOrEqual(16, $recommendation['ayah_range']['to']);
        $this->assertArrayHasKey('workload', $recommendation);
    }

    public function test_payload_from_record_rebuilds_surah_when_json_truncated(): void
    {
        $user = User::factory()->create();
        $session = $this->seedCompletedSession($user, 112, 1, 3);

        $row = SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $session->id,
            'surah_number' => 112,
            'ayah_start' => 4,
            'ayah_end' => 4,
            'recommendation_type' => RecommendationType::CompleteSurah->value,
            'reason_code' => 'complete_remaining_ayat',
            'session_mode' => 'new_learning',
            'status' => 'generated',
            'range_kind' => 'new',
            'recommended_technique' => 'blur',
            'recommended_settings' => [
                'technique' => 'blur',
                'user_reason' => 'You completed this range smoothly. This plan moves forward with light Blur practice rather than extra repetition.',
            ],
            // Truncated payload — missing surah/ayah_range/type (production drift case).
            'payload' => [
                'user_reason' => 'You completed this range smoothly. This plan moves forward with light Blur practice rather than extra repetition.',
            ],
            'idempotency_key' => 'complete-'.$session->id,
        ]);

        $payload = $this->actingAs($user)
            ->getJson('/api/recommendations/next?source_session_id='.$session->id)
            ->assertOk()
            ->json('recommendation');

        $this->assertSame($row->id, $payload['id']);
        $this->assertSame(RecommendationType::CompleteSurah->value, $payload['type']);
        $this->assertSame(112, (int) $payload['surah']['id']);
        $this->assertSame(4, (int) $payload['ayah_range']['from']);
        $this->assertSame(4, (int) $payload['ayah_range']['to']);
        $this->assertStringContainsString('Blur', (string) $payload['user_reason']);
    }

    public function test_long_ayah_recommendation_uses_single_ayah_set(): void
    {
        $user = User::factory()->create();
        $this->seedCompletedSession($user, 2, 281, 281);

        $this->actingAs($user)
            ->getJson('/api/recommendations/next')
            ->assertOk()
            ->assertJsonPath('recommendation.type', RecommendationType::Continue->value)
            ->assertJsonPath('recommendation.ayah_range.from', 282)
            ->assertJsonPath('recommendation.ayah_range.to', 282)
            ->assertJsonPath('recommendation.ayah_range.count', 1);
    }
}
