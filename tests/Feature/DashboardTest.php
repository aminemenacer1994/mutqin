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
            ->assertJsonPath('data.continue.surah_number', 113);

        $href = (string) $response->json('data.continue.href');
        $this->assertStringContainsString('resume=1', $href);
        $this->assertStringContainsString('session=', $href);
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
}
