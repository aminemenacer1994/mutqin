<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\ProductEvent;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserSession;
use App\Services\Achievements\AchievementService;
use App\Services\SessionLifecycleService;
use App\Support\Achievements\AchievementId;
use App\Support\Analytics\ProductEventName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AchievementsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-13 12:00:00');
        config()->set('achievements.min_meaningful_duration_seconds', 20);
        config()->set('achievements.thresholds.consistent_consecutive_days', 3);
        config()->set('achievements.thresholds.reviser_revision_sessions', 10);
        config()->set('achievements.thresholds.dedicated_distinct_days', 7);
        config()->set('achievements.thresholds.growing_min_comparable_attempts', 3);
        config()->set('achievements.thresholds.growing_min_accuracy_delta', 8);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_first_genuine_session_unlocks_first_steps(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->completeSession($user, [
            'ended_at' => now(),
            'duration' => 45,
        ]);

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::FIRST_STEPS,
        ]);
        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::ACHIEVEMENT_UNLOCKED,
            'user_id' => $user->id,
        ]);
    }

    public function test_abandoned_sessions_do_not_unlock_achievements(): void
    {
        $user = User::factory()->create();

        UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::EndedEarly->value,
            'memorisation_mode' => 'beginner',
            'is_onboarding_example' => false,
            'session_duration_seconds' => 120,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => [
                'range_complete' => false,
                'completed' => false,
                'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 3],
            ],
        ]);

        app(AchievementService::class)->evaluateAndPresentNew($user, 'evaluation');

        $this->assertDatabaseMissing('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::FIRST_STEPS,
        ]);
    }

    public function test_three_consecutive_practice_days_unlock_consistent(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        foreach ([0, 1, 2] as $offset) {
            $this->completeSession($user, [
                'ended_at' => now()->subDays(2 - $offset)->setTime(15, 0),
                'duration' => 40,
            ]);
        }
        // Path: First Steps → Checker → Consistent
        $this->attempt($user, 70, '1:1-1', 'align-v1', 'algo-1', now()->subHour());

        app(AchievementService::class)->evaluateAndPresentNew($user, 'evaluation');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::CONSISTENT,
        ]);
    }

    public function test_multiple_sessions_on_one_day_count_as_one_practice_day(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        $day = now()->subDay()->setTime(10, 0);
        $this->completeSession($user, ['ended_at' => $day->copy(), 'duration' => 40]);
        $this->completeSession($user, ['ended_at' => $day->copy()->addHours(2), 'duration' => 40]);
        $this->completeSession($user, ['ended_at' => $day->copy()->addHours(4), 'duration' => 40]);

        $payload = app(AchievementService::class)->fullPayload($user, true);
        $first = collect($payload['items'])->firstWhere('id', AchievementId::FIRST_STEPS);
        $dedicated = collect($payload['items'])->firstWhere('id', AchievementId::DEDICATED);

        $this->assertSame(1, $payload['summary']['practice_days']);
        $this->assertSame('unlocked', $first['state']);
        // Dedicated stays locked by its own threshold, not by path order.
        $this->assertNotSame('path_locked', $dedicated['detail']);
        $this->assertTrue($dedicated['path_open']);
        $this->assertSame(1, $dedicated['current']);
    }

    public function test_ten_revision_sessions_unlock_reviser(): void
    {
        $user = User::factory()->create();
        $this->unlockPrecedingPath($user, AchievementId::REVISER);

        for ($i = 0; $i < 10; $i++) {
            $this->completeSession($user, [
                'ended_at' => now()->subHours(10 - $i),
                'duration' => 35,
                'mode' => 'revision',
            ]);
        }

        app(AchievementService::class)->evaluateAndPresentNew($user, 'evaluation');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::REVISER,
        ]);
    }

    public function test_seven_distinct_days_unlock_dedicated(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);
        $this->unlockPrecedingPath($user, AchievementId::DEDICATED);

        for ($i = 0; $i < 7; $i++) {
            $this->completeSession($user, [
                'ended_at' => now()->subDays(6 - $i)->setTime(12, 0),
                'duration' => 35,
            ]);
        }

        app(AchievementService::class)->evaluateAndPresentNew($user, 'evaluation');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::DEDICATED,
        ]);
    }

    public function test_weekly_goal_uses_user_configuration(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => [
                'timezone' => 'UTC',
                'weekly_practice_days_goal' => 2,
            ],
        ]);
        $this->unlockPrecedingPath($user, AchievementId::FOCUSED);

        $this->completeSession($user, [
            'ended_at' => now()->startOfWeek(Carbon::MONDAY)->setTime(10, 0),
            'duration' => 40,
        ]);
        $this->completeSession($user, [
            'ended_at' => now()->startOfWeek(Carbon::MONDAY)->addDay()->setTime(10, 0),
            'duration' => 40,
        ]);

        app(AchievementService::class)->evaluateAndPresentNew($user, 'weekly_goal');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::FOCUSED,
        ]);
    }

    public function test_growing_requires_comparable_valid_assessments(): void
    {
        $user = User::factory()->create();
        $this->unlockPrecedingPath($user, AchievementId::GROWING);

        // Same passage + model + algorithm, progressive improvement.
        $this->attempt($user, 55, '1:1-1', 'align-v1', 'algo-1', now()->subDays(5));
        $this->attempt($user, 60, '1:1-1', 'align-v1', 'algo-1', now()->subDays(4));
        $this->attempt($user, 72, '1:1-1', 'align-v1', 'algo-1', now()->subDays(3));
        $this->attempt($user, 78, '1:1-1', 'align-v1', 'algo-1', now()->subDays(2));

        // Isolated high score on a different passage must not unlock alone.
        $this->attempt($user, 99, '2:1-1', 'align-v1', 'algo-1', now()->subDay());

        app(AchievementService::class)->evaluateAndPresentNew($user, 'ai_recite');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::GROWING,
        ]);
    }

    public function test_activity_unlocks_later_badges_without_path_prerequisites(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        for ($i = 0; $i < 14; $i++) {
            $this->completeSession($user, [
                'ended_at' => now()->subDays(13 - $i)->setTime(9, 0),
                'duration' => 35,
                'mode' => 'beginner',
                'surah' => 3,
            ]);
        }

        $payload = app(AchievementService::class)->fullPayload($user, true);
        $ids = collect($payload['items'])
            ->where('state', 'unlocked')
            ->pluck('id')
            ->all();

        $this->assertContains(AchievementId::FIRST_STEPS, $ids);
        $this->assertContains(AchievementId::DEDICATED, $ids);
        $this->assertContains(AchievementId::STEADFAST, $ids);
        $this->assertContains(AchievementId::MEMORISER, $ids);
        $steadfast = collect($payload['items'])->firstWhere('id', AchievementId::STEADFAST);
        $this->assertSame('unlocked', $steadfast['state']);
        $this->assertTrue($steadfast['path_open']);
        $this->assertNull($steadfast['requires_id']);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::STEADFAST,
        ]);
    }

    public function test_new_colour_achievements_unlock_from_genuine_history(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        foreach ([112, 113, 114] as $index => $surah) {
            $this->completeSession($user, [
                'ended_at' => now()->subDays(2 - $index)->setTime(11, 0),
                'duration' => 40,
                'mode' => 'beginner',
                'surah' => $surah,
            ]);
        }
        $this->completeSession($user, [
            'ended_at' => now()->subHours(5),
            'duration' => 40,
            'mode' => 'beginner',
            'surah' => 1,
        ]);
        $this->completeSession($user, [
            'ended_at' => now()->subHours(3),
            'duration' => 40,
            'mode' => 'beginner',
            'surah' => 2,
        ]);

        for ($i = 0; $i < 14; $i++) {
            $this->completeSession($user, [
                'ended_at' => now()->subDays(20 - $i)->setTime(9, 0),
                'duration' => 35,
                'mode' => 'beginner',
                'surah' => 3,
            ]);
        }

        $this->attempt($user, 70, '1:1-1', 'align-v1', 'algo-1', now()->subHour());

        app(AchievementService::class)->evaluateAndPresentNew($user, 'evaluation');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::CHECKER,
        ]);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::MEMORISER,
        ]);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::EXPLORER,
        ]);
        // Steadfast unlocks from distinct practice days alone — no path prerequisite.
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => AchievementId::STEADFAST,
        ]);
    }

    public function test_duplicate_events_cannot_award_duplicate_achievements(): void
    {
        $user = User::factory()->create();
        $this->completeSession($user, ['ended_at' => now(), 'duration' => 50]);

        $service = app(AchievementService::class);
        $service->evaluateAndPresentNew($user, 'session_complete');
        $service->evaluateAndPresentNew($user, 'session_complete');
        $service->evaluateAndPresentNew($user, 'backfill');

        $this->assertSame(1, UserAchievement::query()
            ->where('user_id', $user->id)
            ->where('achievement_id', AchievementId::FIRST_STEPS)
            ->count());
        $this->assertSame(1, ProductEvent::query()
            ->where('event_name', ProductEventName::ACHIEVEMENT_UNLOCKED)
            ->where('user_id', $user->id)
            ->where('idempotency_key', 'achievement:'.$user->id.':'.AchievementId::FIRST_STEPS)
            ->count());
    }

    public function test_historical_session_data_is_handled_safely(): void
    {
        $user = User::factory()->create([
            'practice_preferences' => ['timezone' => 'UTC'],
        ]);

        $historic = now()->subDays(20)->setTime(9, 30);
        UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Completed->value,
            'memorisation_mode' => 'beginner',
            'is_onboarding_example' => false,
            'session_duration_seconds' => 60,
            'ended_at' => $historic,
            'last_activity_at' => $historic,
            'metadata' => [
                'range_complete' => true,
                'completed' => true,
                'config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 3],
            ],
        ]);

        $service = app(AchievementService::class);
        $service->evaluateAndPresentNew($user, 'backfill');

        $row = UserAchievement::query()
            ->where('user_id', $user->id)
            ->where('achievement_id', AchievementId::FIRST_STEPS)
            ->first();

        $this->assertNotNull($row);
        $this->assertTrue($row->unlocked_at->equalTo($historic));
        $this->assertSame('backfill', $row->unlock_source);
    }

    public function test_unlock_notifications_are_acknowledged_once(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $this->completeSession($user, ['ended_at' => now(), 'duration' => 40]);
        app(AchievementService::class)->evaluateAndPresentNew($user, 'session_complete');

        $this->postJson('/api/achievements/acknowledge', [
            'achievement_ids' => [AchievementId::FIRST_STEPS],
        ])->assertOk();

        $row = UserAchievement::query()
            ->where('user_id', $user->id)
            ->where('achievement_id', AchievementId::FIRST_STEPS)
            ->first();
        $this->assertNotNull($row->notified_at);

        $payload = $this->getJson('/api/achievements')->assertOk()->json();
        $pending = collect($payload['pending_unlocks'] ?? []);
        $this->assertFalse($pending->contains(fn ($item) => ($item['id'] ?? '') === AchievementId::FIRST_STEPS));
    }

    public function test_dashboard_includes_achievements_widget(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->getJson('/api/dashboard')->assertOk();
        $data = $response->json('data') ?? $response->json();
        $this->assertArrayHasKey('achievements', $data);
        $this->assertArrayHasKey('initial', $data['achievements']);
    }

    public function test_browser_may_record_achievement_view_events_without_recitation_data(): void
    {
        $payload = [
            'event' => ProductEventName::ACHIEVEMENT_VIEWED,
            'anonymous_id' => '22222222-2222-4222-8222-222222222222',
            'idempotency_key' => 'achievement-view:test',
            'properties' => [
                'achievement_id' => 'reviser',
                'achievement_category' => 'revision',
                'progress_percentage' => 60,
                'transcript' => 'should-not-store',
            ],
        ];

        $this->postJson('/api/product-events', $payload)->assertCreated();

        $event = ProductEvent::query()->firstOrFail();
        $this->assertSame('reviser', $event->properties['achievement_id'] ?? null);
        $this->assertArrayNotHasKey('transcript', $event->properties ?? []);
    }

    /**
     * Insert every path badge before $targetId so later badges can unlock.
     */
    private function unlockPrecedingPath(User $user, string $targetId): void
    {
        foreach (AchievementId::all() as $id) {
            if ($id === $targetId) {
                break;
            }
            UserAchievement::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'achievement_id' => $id,
                ],
                [
                    'unlocked_at' => now()->subDays(30),
                    'unlock_source' => 'backfill',
                    'progress_snapshot' => ['current' => 1, 'target' => 1, 'percent' => 100],
                    'notified_at' => now()->subDays(30),
                ],
            );
        }
    }

    /**
     * @param  array{ended_at?: Carbon, duration?: int, mode?: string, surah?: int}  $opts
     */
    private function completeSession(User $user, array $opts = []): UserSession
    {
        $endedAt = $opts['ended_at'] ?? now();
        $duration = (int) ($opts['duration'] ?? 40);
        $mode = (string) ($opts['mode'] ?? 'beginner');
        $surah = (int) ($opts['surah'] ?? 112);

        $session = UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => $surah,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active->value,
            'memorisation_mode' => $mode,
            'is_onboarding_example' => false,
            'session_duration_seconds' => 0,
            'started_at' => $endedAt->copy()->subMinutes(5),
            'last_activity_at' => $endedAt->copy()->subMinute(),
            'metadata' => [
                'config' => [
                    'chapterId' => $surah,
                    'rangeStart' => 1,
                    'rangeEnd' => 3,
                    'sessionMode' => $mode === 'revision' ? 'revision' : 'new_learning',
                ],
            ],
        ]);

        return app(SessionLifecycleService::class)->end($user, [
            'session_id' => $session->id,
            'range_complete' => true,
            'session_duration_seconds' => $duration,
            'ended_at' => $endedAt,
            'last_activity_at' => $endedAt,
            'metadata' => [
                'range_complete' => true,
                'completed' => true,
                'config' => [
                    'chapterId' => $surah,
                    'rangeStart' => 1,
                    'rangeEnd' => 3,
                    'sessionMode' => $mode === 'revision' ? 'revision' : 'new_learning',
                ],
            ],
        ]);
    }

    private function attempt(
        User $user,
        int $accuracy,
        string $passage,
        string $model,
        string $algorithm,
        Carbon $at,
    ): void {
        [$surah, $range] = explode(':', $passage);
        [$from, $to] = explode('-', $range);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => (int) $surah,
            'start_ayah' => (int) $from,
            'end_ayah' => (int) $to,
            'status' => 'completed',
            'overall_accuracy' => $accuracy,
            'model_version' => $model,
            'algorithm_version' => $algorithm,
            'assessment_type' => 'dashboard_ai_recite',
            'failure_reason' => null,
        ]);
        $assessment->forceFill(['created_at' => $at, 'updated_at' => $at])->save();

        $attempt = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'memorisation_assessment_id' => $assessment->id,
            'attempt_number' => (int) $assessment->id,
            'accuracy_percent' => $accuracy,
            'band' => $accuracy >= 85 ? 'strong' : ($accuracy >= 60 ? 'mixed' : 'weak'),
            'ayah_range' => [
                'surah' => (int) $surah,
                'from' => (int) $from,
                'to' => (int) $to,
            ],
        ]);
        $attempt->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
    }
}
