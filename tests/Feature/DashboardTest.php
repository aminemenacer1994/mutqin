<?php

namespace Tests\Feature;

use App\Enums\RecommendationStatus;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\LearningAnalytic;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use App\Services\MainMemorisationPositionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_dashboard(): void
    {
        $this->get('/dashboard')
            ->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_view_dashboard_page(): void
    {
        $user = User::factory()->create(['name' => 'Amina Hassan']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertSee('user-dashboard', false)
            ->assertSee('Assalamu alaikum, Amina', false);
    }

    public function test_dashboard_api_requires_authentication(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_dashboard_api_is_scoped_to_authenticated_user(): void
    {
        $user = User::factory()->create(['name' => 'Omar']);
        $other = User::factory()->create(['name' => 'Other']);

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subDay(),
            'last_activity_at' => now()->subDay(),
            'metadata' => [
                'completed' => true,
                'config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 4],
            ],
        ]);

        UserSession::create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        MemorisationProgress::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 80,
            'repetitions' => 3,
            'completed_at' => now()->subDays(2),
        ]);

        MemorisationProgress::create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 90,
            'repetitions' => 5,
            'completed_at' => now(),
        ]);

        AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 72,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 4],
            'weak_words' => [
                ['ayahNumber' => 2, 'text' => 'الصمد'],
            ],
        ]);

        AyahNote::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'title' => 'Reflection',
            'body' => 'Keep this firm.',
        ]);

        MemorisationSyncState::create([
            'user_id' => $user->id,
            'state' => json_encode([
                'savedSessions' => [
                    ['id' => 's1', 'name' => 'Morning'],
                    ['id' => 's2', 'name' => 'Evening'],
                ],
            ], JSON_UNESCAPED_UNICODE),
            'payload_hash' => hash('sha256', 'dashboard-test'),
            'state_updated_at' => now(),
        ]);

        LearningAnalytic::create([
            'user_id' => $user->id,
            'session_date' => now()->toDateString(),
            'sessions_completed' => 1,
            'total_minutes' => 12,
            'ayahs_memorised' => 1,
            'ayahs_reviewed' => 0,
            'streak_day' => 1,
        ]);

        MemorisationAssessment::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 7,
            'surah_name' => 'Al-Fatihah',
            'weakness_analysis' => [
                'weak_ayahs' => [4],
                'weak_phrases' => [
                    ['ayah_number' => 4, 'text' => 'مالك يوم الدين'],
                ],
            ],
            'overall_accuracy' => 61,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard?days=7')
            ->assertOk()
            ->assertJsonPath('data.welcome.first_name', 'Omar')
            ->assertJsonPath('data.snapshot.completed_sessions.value', 1)
            ->assertJsonPath('data.snapshot.saved_sessions.value', 2)
            ->assertJsonPath('data.snapshot.memorised_ayahs.value', 1)
            ->assertJsonPath('data.snapshot.ai_recite_attempts.value', 1)
            ->assertJsonPath('data.snapshot.notes.value', 1)
            ->assertJsonPath('data.chart.days', 7);

        $this->assertNotEmpty($response->json('data.weaknesses.items'));
        $this->assertSame('Al-Fatihah', $response->json('data.weaknesses.items.0.surah_name'));
        $this->assertSame(4, $response->json('data.weaknesses.items.0.ayah_number'));
    }

    public function test_continue_card_prioritises_unfinished_session(): void
    {
        $user = User::factory()->create(['name' => 'Layla']);

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 113,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'paused_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'memorisation_mode' => 'beginner',
            'metadata' => [
                'paused' => true,
                'config' => ['chapterId' => 113, 'rangeStart' => 1, 'rangeEnd' => 5],
            ],
        ]);

        SessionRecommendation::create([
            'user_id' => $user->id,
            'surah_number' => 114,
            'ayah_start' => 1,
            'ayah_end' => 6,
            'recommendation_type' => 'revision',
            'reason_code' => 'performance_review',
            'status' => RecommendationStatus::Generated,
            'session_mode' => 'revision',
            'recommended_technique' => 'talqin',
            'recommended_playback_speed' => 0.85,
        ]);

        UserLastPosition::create([
            'user_id' => $user->id,
            'surah_number' => 114,
            'ayah_number' => 1,
            'last_opened_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.meta.owner_id', $user->id)
            ->assertJsonPath('data.continue.action_type', 'resume_session')
            ->assertJsonPath('data.continue.cta_key', 'cta_resume')
            ->assertJsonPath('data.continue.surah_number', 113)
            ->assertJsonPath('data.recommended_next.surah_number', 114)
            ->assertJsonPath('data.recommended_next.ayah_start', 1)
            ->assertJsonPath('data.recommended_next.ayah_end', 6)
            ->assertJsonPath('data.recommended_next.technique_label', 'Talqin')
            ->assertJsonPath('data.recommended_next.speed_label', '0.85x');

        $href = (string) $response->json('data.continue.href');
        $this->assertStringContainsString('resume=1', $href);
        $this->assertStringContainsString('session=', $href);

        $recommendHref = (string) $response->json('data.recommended_next.href');
        $this->assertStringContainsString('recommendation=', $recommendHref);
        $this->assertStringContainsString('surah=114', $recommendHref);
    }

    public function test_dashboard_api_ignores_client_supplied_user_id(): void
    {
        $user = User::factory()->create(['name' => 'Amina']);
        $other = User::factory()->create(['name' => 'Other']);

        UserSession::create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard?user_id='.$other->id)
            ->assertOk()
            ->assertOk()
            ->assertJsonPath('data.meta.owner_id', $user->id)
            ->assertJsonPath('data.snapshot.completed_sessions.value', 0);

        $cacheControl = strtolower((string) $this->actingAs($user)->getJson('/api/dashboard')->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('private', $cacheControl);
    }

    public function test_ended_early_sessions_are_not_counted_as_completed(): void
    {
        $user = User::factory()->create();

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 108,
            'ayah_number' => 2,
            'status' => UserSessionStatus::EndedEarly,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => false],
        ]);

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 109,
            'ayah_number' => 6,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.snapshot.completed_sessions.value', 1);
    }

    public function test_chart_is_empty_when_user_has_no_sessions(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/dashboard?days=7')
            ->assertOk()
            ->assertJsonPath('data.chart.is_empty', true)
            ->assertJsonPath('data.chart.points', []);
    }

    public function test_chart_starts_at_first_session_when_sparse(): void
    {
        $user = User::factory()->create();
        $firstSessionAt = now()->subDays(2)->setTime(10, 0);

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => $firstSessionAt,
            'last_activity_at' => $firstSessionAt,
            'metadata' => ['completed' => true],
        ]);

        LearningAnalytic::create([
            'user_id' => $user->id,
            'session_date' => $firstSessionAt->toDateString(),
            'sessions_completed' => 1,
            'total_minutes' => 8,
            'ayahs_memorised' => 1,
            'ayahs_reviewed' => 0,
            'streak_day' => 1,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard?days=7')
            ->assertOk()
            ->assertJsonPath('data.chart.is_empty', false);

        $points = $response->json('data.chart.points');
        $this->assertNotEmpty($points);
        $this->assertSame($firstSessionAt->toDateString(), $points[0]['date']);
        $this->assertLessThanOrEqual(3, count($points));
    }

    public function test_chart_days_toggle_returns_matching_range_and_labels(): void
    {
        $user = User::factory()->create();

        foreach ([20, 10, 2] as $daysAgo) {
            $at = now()->subDays($daysAgo)->setTime(11, 0);
            UserSession::create([
                'user_id' => $user->id,
                'surah_number' => 112,
                'ayah_number' => 1,
                'status' => UserSessionStatus::Completed,
                'is_onboarding_example' => false,
                'ended_at' => $at,
                'last_activity_at' => $at,
                'metadata' => ['completed' => true],
            ]);
            LearningAnalytic::create([
                'user_id' => $user->id,
                'session_date' => $at->toDateString(),
                'sessions_completed' => 1,
                'total_minutes' => 6,
                'ayahs_memorised' => 1,
                'ayahs_reviewed' => 0,
                'streak_day' => 1,
            ]);
        }

        $seven = $this->actingAs($user)
            ->getJson('/api/dashboard?days=7')
            ->assertOk()
            ->assertJsonPath('data.chart.days', 7)
            ->assertJsonPath('data.meta.chart_days', 7)
            ->json('data.chart.points');

        $thirty = $this->actingAs($user)
            ->getJson('/api/dashboard?days=30')
            ->assertOk()
            ->assertJsonPath('data.chart.days', 30)
            ->assertJsonPath('data.meta.chart_days', 30)
            ->json('data.chart.points');

        $this->assertNotEmpty($seven);
        $this->assertNotEmpty($thirty);
        $this->assertGreaterThan(count($seven), count($thirty));
        $this->assertSame(now()->subDays(2)->toDateString(), $seven[0]['date']);
        $this->assertSame(now()->subDays(20)->toDateString(), $thirty[0]['date']);
        $this->assertArrayHasKey('date', $seven[0]);
        $this->assertArrayHasKey('primary', $seven[0]);
        $this->assertArrayHasKey('secondary', $seven[0]);
    }

    public function test_activity_log_returns_sessions_ai_checks_and_notes_chronologically(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 4,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subHours(3),
            'last_activity_at' => now()->subHours(3),
            'metadata' => [
                'completed' => true,
                'config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 4],
            ],
        ]);

        $ai = AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 81,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 4],
        ]);
        $ai->forceFill([
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ])->save();

        $note = AyahNote::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'body' => 'Review the middle carefully.',
        ]);
        $note->forceFill([
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ])->save();

        // Other user's activity must never leak.
        UserSession::create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard/activity')
            ->assertOk();

        $items = $response->json('activity');
        $this->assertCount(3, $items);
        $this->assertSame('note', $items[0]['type']);
        $this->assertSame('note_body', $items[0]['outcome_key']);
        $this->assertSame('Review the middle carefully.', $items[0]['outcome_params']['body']);
        $this->assertSame('ai_check', $items[1]['type']);
        $this->assertSame('ai_result', $items[1]['outcome_key']);
        $this->assertSame('strong', $items[1]['outcome_params']['band']);
        $this->assertSame(81, $items[1]['outcome_params']['accuracy']);
        $this->assertSame('session', $items[2]['type']);
        $this->assertSame('session_completed', $items[2]['outcome_key']);
        $this->assertSame(112, $items[2]['surah_number']);
        $this->assertSame(1, $items[2]['ayah_start']);
        $this->assertSame(4, $items[2]['ayah_end']);
    }

    public function test_memorised_count_increments_when_range_marked_memorised(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.snapshot.memorised_ayahs.value', 0);

        $this->actingAs($user)
            ->postJson('/api/progress', [
                'items' => [
                    [
                        'surah_number' => 112,
                        'ayah_number' => 1,
                        'status' => 'memorised',
                        'mastery_level' => 80,
                        'repetitions' => 3,
                    ],
                    [
                        'surah_number' => 112,
                        'ayah_number' => 2,
                        'status' => 'mastered',
                        'mastery_level' => 95,
                        'repetitions' => 5,
                    ],
                    [
                        'surah_number' => 112,
                        'ayah_number' => 3,
                        'status' => 'learning',
                        'mastery_level' => 20,
                        'repetitions' => 1,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('count', 3);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.snapshot.memorised_ayahs.value', 2)
            ->assertJsonPath('data.progress.memorised_ayah_count', 2)
            ->assertJsonPath('data.progress.learning_ayah_count', 1);
    }

    public function test_surah_progress_uses_practised_ayahs_and_stays_visible_at_low_percent(): void
    {
        $user = User::factory()->create();

        UserLastPosition::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 3,
            'last_opened_at' => now(),
        ]);

        // 3 practised ayahs of Al-Baqarah (286) ≈ 1% — must not round to 0.
        foreach ([1, 2, 3] as $ayah) {
            MemorisationProgress::create([
                'user_id' => $user->id,
                'surah_number' => 2,
                'ayah_number' => $ayah,
                'status' => $ayah === 3 ? 'learning' : 'memorised',
                'mastery_level' => $ayah === 3 ? 20 : 80,
                'repetitions' => 1,
            ]);
        }

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.progress.current_surah_number', 2)
            ->assertJsonPath('data.progress.surah_ayah_count', 286)
            ->assertJsonPath('data.progress.surah_practised_ayah_count', 3)
            ->assertJsonPath('data.progress.surah_completion_percent', 1);
    }

    public function test_session_history_is_scoped_to_authenticated_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 4,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'metadata' => [
                'completed' => true,
                'config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 4],
            ],
        ]);

        UserSession::create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => [
                'completed' => true,
                'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
            ],
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/sessions/history')
            ->assertOk();

        $sessions = $response->json('sessions');
        $this->assertCount(1, $sessions);
        $this->assertSame(112, $sessions[0]['surah_number']);
        $this->assertSame(1, $sessions[0]['ayah_start']);
        $this->assertSame(4, $sessions[0]['ayah_end']);
        $this->assertSame('completed', $sessions[0]['status']);
    }

    public function test_ai_recite_attempts_list_is_scoped_to_authenticated_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 81,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 4],
        ]);

        AiReciteAttempt::create([
            'user_id' => $other->id,
            'attempt_number' => 1,
            'accuracy_percent' => 40,
            'band' => 'weak',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 7],
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/ai-recite-attempts')
            ->assertOk();

        $attempts = $response->json('attempts');
        $this->assertCount(1, $attempts);
        $this->assertSame(112, $attempts[0]['surah_number']);
        $this->assertSame(1, $attempts[0]['ayah_start']);
        $this->assertSame(4, $attempts[0]['ayah_end']);
        $this->assertSame('strong', $attempts[0]['band']);
        $this->assertSame(81, $attempts[0]['accuracy_percent']);
    }

    public function test_week_summary_reflects_current_week_activity(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.week_summary.is_empty', true)
            ->assertJsonPath('data.week_summary.sessions', 0)
            ->assertJsonPath('data.week_summary.ai_checks', 0)
            ->assertJsonPath('data.week_summary.ayahs_practised', 0);

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 70,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 2],
        ]);

        LearningAnalytic::create([
            'user_id' => $user->id,
            'session_date' => now()->toDateString(),
            'sessions_completed' => 1,
            'total_minutes' => 10,
            'ayahs_memorised' => 2,
            'ayahs_reviewed' => 1,
            'streak_day' => 1,
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.week_summary.is_empty', false)
            ->assertJsonPath('data.week_summary.sessions', 1)
            ->assertJsonPath('data.week_summary.ai_checks', 1)
            ->assertJsonPath('data.week_summary.ayahs_practised', 3);
    }

    public function test_recommended_next_is_hidden_without_recommendation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.recommended_next', null);
    }

    public function test_recommended_next_prefers_last_completed_session_recommendation(): void
    {
        $user = User::factory()->create();

        $older = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 108,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subDays(2),
            'last_activity_at' => now()->subDays(2),
            'metadata' => ['completed' => true],
        ]);

        $latest = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 4,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'metadata' => ['completed' => true],
        ]);

        SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $older->id,
            'surah_number' => 108,
            'ayah_start' => 1,
            'ayah_end' => 3,
            'recommendation_type' => 'revision',
            'reason_code' => 'performance_review',
            'status' => RecommendationStatus::Generated,
            'session_mode' => 'revision',
            'recommended_technique' => 'blur',
            'recommended_playback_speed' => 1,
        ]);

        SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $latest->id,
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'recommendation_type' => 'revision',
            'reason_code' => 'performance_review',
            'status' => RecommendationStatus::Generated,
            'session_mode' => 'revision',
            'recommended_technique' => 'focus',
            'recommended_playback_speed' => 0.75,
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.recommended_next.surah_number', 112)
            ->assertJsonPath('data.recommended_next.technique_label', 'Focus')
            ->assertJsonPath('data.recommended_next.speed_label', '0.75x');
    }

    public function test_streak_state_marks_broken_when_no_session_yesterday(): void
    {
        $user = User::factory()->create();

        LearningAnalytic::create([
            'user_id' => $user->id,
            'session_date' => now()->subDays(3)->toDateString(),
            'sessions_completed' => 1,
            'total_minutes' => 8,
            'ayahs_memorised' => 1,
            'ayahs_reviewed' => 0,
            'streak_day' => 1,
        ]);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.retention.streak_days', 0)
            ->assertJsonPath('data.retention.streak_broken', true)
            ->assertJsonPath('data.retention.streak_has_history', true);
    }

    public function test_needs_review_items_include_ai_strength_labels(): void
    {
        $user = User::factory()->create();

        MemorisationAssessment::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'start_ayah' => 1,
            'end_ayah' => 4,
            'surah_name' => 'Al-Ikhlas',
            'weakness_analysis' => [
                'weak_ayahs' => [1, 2, 3],
            ],
            'overall_accuracy' => 55,
        ]);

        AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 1,
            'accuracy_percent' => 42,
            'band' => 'weak',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 1],
            'weak_words' => [
                ['ayahNumber' => 1, 'text' => 'أحد'],
                ['ayahNumber' => 1, 'text' => 'الصمد'],
                ['ayahNumber' => 1, 'text' => 'ولم'],
            ],
        ]);

        AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 2,
            'accuracy_percent' => 68,
            'band' => 'mixed',
            'ayah_range' => ['surah' => 112, 'from' => 2, 'to' => 2],
            'weak_words' => [
                ['ayahNumber' => 2, 'text' => 'الله'],
            ],
        ]);

        AiReciteAttempt::create([
            'user_id' => $user->id,
            'attempt_number' => 3,
            'accuracy_percent' => 88,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 3, 'to' => 3],
            'weak_words' => [],
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk();

        $items = collect($response->json('data.weaknesses.items'));
        $this->assertSame('fragile', $items->firstWhere('ayah_number', 1)['strength'] ?? null);
        $this->assertSame('building', $items->firstWhere('ayah_number', 2)['strength'] ?? null);
        $this->assertSame('strong', $items->firstWhere('ayah_number', 3)['strength'] ?? null);
    }

    public function test_dashboard_survives_mixed_case_legacy_status_values(): void
    {
        $user = User::factory()->create(['name' => 'Amina']);

        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'metadata' => [
                'config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 4],
            ],
        ]);

        $recommendation = SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $session->id,
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'recommendation_type' => 'continue',
            'reason_code' => 'continue_range',
            'status' => RecommendationStatus::Generated,
        ]);

        \Illuminate\Support\Facades\DB::table('user_sessions')
            ->where('id', $session->id)
            ->update(['status' => 'Active']);
        \Illuminate\Support\Facades\DB::table('session_recommendations')
            ->where('id', $recommendation->id)
            ->update(['status' => 'Generated']);

        $reloaded = UserSession::query()->findOrFail($session->id);
        $this->assertSame(UserSessionStatus::Active, $reloaded->status);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertSee('user-dashboard', false);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.welcome.first_name', 'Amina');
    }

    public function test_first_time_journey_offers_simple_start_choices(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.journey.has_started', false)
            ->assertJsonPath('data.journey.continue', null)
            ->assertJsonPath('data.journey.review', null)
            ->assertJsonPath('data.journey.overall.percent', 0);

        $start = (string) $this->actingAs($user)->getJson('/api/dashboard')->json('data.journey.start_beginning_href');
        $choose = (string) $this->actingAs($user)->getJson('/api/dashboard')->json('data.journey.choose_start_href');
        $this->assertStringContainsString('surah=1', $start);
        $this->assertStringContainsString('from=1', $start);
        $this->assertStringContainsString('to=7', $start);
        $this->assertStringContainsString('journey=main', $start);
        $this->assertStringContainsString('setup=1', $choose);
        $this->assertStringContainsString('journey=choose', $choose);
    }

    public function test_journey_continue_card_uses_main_position_not_free_practice(): void
    {
        $user = User::factory()->create();

        UserLastPosition::create([
            'user_id' => $user->id,
            'surah_number' => 36,
            'ayah_number' => 1,
            'last_opened_at' => now(),
            'metadata' => [
                'rangeStart' => 1,
                'rangeEnd' => 10,
                'main_position' => [
                    'surah_number' => 2,
                    'ayah_start' => 21,
                    'ayah_end' => 30,
                    'source' => 'explicit',
                ],
            ],
        ]);

        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 36,
            'ayah_number' => 4,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'paused_at' => now()->subMinutes(10),
            'last_activity_at' => now()->subMinutes(10),
            'metadata' => [
                'paused' => true,
                'config' => ['chapterId' => 36, 'rangeStart' => 1, 'rangeEnd' => 10],
            ],
        ]);

        for ($ayah = 21; $ayah <= 27; $ayah++) {
            MemorisationProgress::create([
                'user_id' => $user->id,
                'surah_number' => 2,
                'ayah_number' => $ayah,
                'status' => 'memorised',
                'mastery_level' => 80,
                'repetitions' => 3,
                'completed_at' => now()->subDay(),
            ]);
        }

        SessionRecommendation::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_start' => 1,
            'ayah_end' => 7,
            'recommendation_type' => 'revision',
            'reason_code' => 'performance_review',
            'status' => RecommendationStatus::Generated,
            'session_mode' => 'revision',
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.journey.has_started', true)
            ->assertJsonPath('data.journey.continue.surah_number', 2)
            ->assertJsonPath('data.journey.continue.ayah_start', 21)
            ->assertJsonPath('data.journey.continue.ayah_end', 30)
            ->assertJsonPath('data.journey.continue.remembered_count', 7)
            ->assertJsonPath('data.journey.continue.range_ayah_count', 10)
            ->assertJsonPath('data.continue.surah_number', 2)
            ->assertJsonPath('data.journey.review.surah_number', 1)
            ->assertJsonPath('data.journey.overall.percent', 1);

        $this->assertSame('Al-Fatihah', $response->json('data.journey.review.surah_name'));
        $this->assertStringContainsString('journey=main', (string) $response->json('data.journey.continue.href'));
        $this->assertStringNotContainsString('resume=1', (string) $response->json('data.continue.href'));
    }

    public function test_session_start_on_another_range_does_not_move_main_position(): void
    {
        $user = User::factory()->create();

        UserLastPosition::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 21,
            'last_opened_at' => now(),
            'metadata' => [
                'main_position' => [
                    'surah_number' => 2,
                    'ayah_start' => 21,
                    'ayah_end' => 30,
                    'source' => 'explicit',
                ],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 36,
                'ayah_number' => 1,
                'memorisation_mode' => 'advanced',
                'metadata' => [
                    'config' => [
                        'chapterId' => 36,
                        'rangeStart' => 1,
                        'rangeEnd' => 10,
                    ],
                ],
            ])
            ->assertOk();

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.journey.continue.surah_number', 2)
            ->assertJsonPath('data.journey.continue.ayah_start', 21)
            ->assertJsonPath('data.journey.continue.ayah_end', 30);

        $position = UserLastPosition::where('user_id', $user->id)->first();
        $this->assertSame(2, $position->metadata['main_position']['surah_number']);
        $this->assertSame(21, $position->metadata['main_position']['ayah_start']);
    }

    public function test_continue_api_preserves_main_position_metadata(): void
    {
        $user = User::factory()->create();

        UserLastPosition::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 21,
            'last_opened_at' => now(),
            'metadata' => [
                'main_position' => [
                    'surah_number' => 2,
                    'ayah_start' => 21,
                    'ayah_end' => 30,
                    'source' => 'explicit',
                ],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/continue', [
                'surah_number' => 36,
                'ayah_number' => 5,
                'last_step' => 2,
                'metadata' => ['source' => 'browse'],
            ])
            ->assertOk();

        $position = UserLastPosition::where('user_id', $user->id)->first();
        $this->assertSame(36, $position->surah_number);
        $this->assertSame(5, $position->ayah_number);
        $this->assertSame(2, $position->metadata['main_position']['surah_number']);
        $this->assertSame(21, $position->metadata['main_position']['ayah_start']);
        $this->assertSame(30, $position->metadata['main_position']['ayah_end']);
    }

    public function test_continue_recommendation_advances_main_position(): void
    {
        $user = User::factory()->create();

        UserLastPosition::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 21,
            'last_opened_at' => now(),
            'metadata' => [
                'main_position' => [
                    'surah_number' => 2,
                    'ayah_start' => 21,
                    'ayah_end' => 30,
                    'source' => 'explicit',
                ],
            ],
        ]);

        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 30,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => [
                'completed' => true,
                'config' => ['chapterId' => 2, 'rangeStart' => 21, 'rangeEnd' => 30],
            ],
        ]);

        $recommendation = SessionRecommendation::create([
            'user_id' => $user->id,
            'source_session_id' => $session->id,
            'surah_number' => 2,
            'ayah_start' => 31,
            'ayah_end' => 33,
            'recommendation_type' => 'continue',
            'reason_code' => 'continue_range',
            'status' => RecommendationStatus::Generated,
            'session_mode' => 'new_learning',
        ]);

        app(MainMemorisationPositionService::class)
            ->advanceFromRecommendation($user, $recommendation, $session);

        $this->actingAs($user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.journey.continue.surah_number', 2)
            ->assertJsonPath('data.journey.continue.ayah_start', 31)
            ->assertJsonPath('data.journey.continue.ayah_end', 33);
    }
}
