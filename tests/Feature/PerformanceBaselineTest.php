<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\LearningAnalytic;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\User;
use App\Models\UserSession;
use Database\Seeders\PerformanceLoadSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\Support\QueryCounter;
use Tests\TestCase;

/**
 * Query-count and payload-size guardrails for hot API paths.
 *
 * Run: php artisan test --filter=PerformanceBaselineTest
 * These tests establish baselines in CI; regressions fail the build.
 */
class PerformanceBaselineTest extends TestCase
{
    use QueryCounter;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config(['mutqin.perf_benchmarks' => true]);

        putenv('PERF_SEED_USERS=1');
        putenv('PERF_SEED_AYAHS=120');
        putenv('PERF_SEED_SESSIONS=30');
        Artisan::call('db:seed', ['--class' => PerformanceLoadSeeder::class, '--force' => true]);

        $this->user = User::query()->where('email', 'perf-user-1@mutqin-load.test')->firstOrFail();
    }

    public function test_dashboard_cold_build_stays_within_query_budget(): void
    {
        $measured = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/dashboard?days=30')
            ->assertOk());

        $this->assertLessThanOrEqual(
            52,
            $measured['count'],
            'Dashboard cold build exceeded query budget: '.$measured['count']
        );
        $this->assertLessThan(
            120_000,
            strlen((string) $measured['result']->getContent()),
            'Dashboard payload too large'
        );
    }

    public function test_dashboard_warm_cache_uses_fewer_queries(): void
    {
        $this->actingAs($this->user)->getJson('/api/dashboard?days=30')->assertOk();

        $measured = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/dashboard?days=30')
            ->assertOk());

        $this->assertLessThanOrEqual(
            3,
            $measured['count'],
            'Cached dashboard should hit cache store only'
        );
    }

    public function test_state_show_avoids_write_on_recent_pull(): void
    {
        MemorisationSyncState::query()
            ->where('user_id', $this->user->id)
            ->update(['last_pulled_at' => now()]);

        $measured = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/state')
            ->assertOk());

        $this->assertLessThanOrEqual(2, $measured['count']);
        $this->assertStringNotContainsString(
            'update',
            strtolower(implode(' ', $measured['queries'])),
            'State show should not write when last_pulled_at is recent'
        );
    }

    public function test_progress_index_is_paginated_and_bounded(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/progress?limit=50')
            ->assertOk();

        $items = $response->json('progress');
        $this->assertIsArray($items);
        $this->assertLessThanOrEqual(50, count($items));
        $this->assertNotNull($response->json('meta.total'));
    }

    public function test_session_lifecycle_endpoints_use_indexed_queries(): void
    {
        UserSession::query()->create([
            'user_id' => $this->user->id,
            'surah_number' => 1,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'metadata' => ['config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7]],
        ]);

        $current = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/session/current')
            ->assertOk());
        $this->assertLessThanOrEqual(4, $current['count']);

        $history = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/sessions/history')
            ->assertOk());
        $this->assertLessThanOrEqual(3, $history['count']);
    }

    public function test_ai_recite_and_recommendations_are_bounded(): void
    {
        AiReciteAttempt::query()->where('user_id', $this->user->id)->count();

        $attempts = $this->actingAs($this->user)
            ->getJson('/api/ai-recite-attempts')
            ->assertOk();
        $this->assertLessThanOrEqual(100, count($attempts->json('attempts') ?? []));

        $rec = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/recommendations/next')
            ->assertOk());
        $this->assertLessThanOrEqual(16, $rec['count']);
    }

    public function test_ayah_notes_and_analytics_respect_limits(): void
    {
        AyahNote::query()->where('user_id', $this->user->id)->count();

        $notes = $this->actingAs($this->user)
            ->getJson('/api/ayah-notes')
            ->assertOk();
        $this->assertLessThanOrEqual(500, count($notes->json('notes') ?? []));

        $analytics = $this->countQueries(fn () => $this->actingAs($this->user)
            ->getJson('/api/analytics')
            ->assertOk());
        $this->assertLessThanOrEqual(3, $analytics['count']);
    }

    public function test_state_unchanged_autosave_skips_heavy_write(): void
    {
        $state = MemorisationSyncState::query()->where('user_id', $this->user->id)->firstOrFail();
        $decoded = json_decode((string) $state->state, true);

        $measured = $this->countQueries(fn () => $this->actingAs($this->user)
            ->postJson('/api/state', [
                'state' => $decoded,
                'meta' => [
                    'device_id' => 'perf-test',
                    'local_updated_at' => now()->toIso8601String(),
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unchanged', true));

        $this->assertLessThanOrEqual(3, $measured['count']);
    }
}
