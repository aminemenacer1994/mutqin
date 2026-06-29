<?php

namespace Tests\Feature;

use App\Models\LearningAnalytic;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearningPersistenceTest extends TestCase
{
    use RefreshDatabase;

    private function sampleState(): array
    {
        return [
            'version' => 1,
            'ayahs' => [
                '2:255' => [
                    'id' => '2:255',
                    'text' => 'ayah text',
                    'mastery_level' => 5,
                    'repetition_count' => 12,
                    'zone' => 'Strong',
                    'status' => 'mastered',
                    'last_review' => now()->toDateString(),
                    'next_review' => now()->addDay()->toDateString(),
                ],
                '2:256' => [
                    'id' => '2:256',
                    'mastery_level' => 2,
                    'repetition_count' => 3,
                    'status' => 'learning',
                ],
            ],
            'sessionState' => [
                'active' => true,
                'mode' => 'beginner',
                'phase' => 'Takrar',
                'current_index' => 1,
                'started_at' => now()->subMinutes(10)->toIso8601String(),
                'updated_at' => now()->toIso8601String(),
                'config' => ['chapterId' => 2, 'rangeStart' => 255, 'rangeEnd' => 256],
                'queue' => [
                    ['phase' => 'Takrar', 'ayahId' => '2:255', 'repeatCount' => 2],
                    ['phase' => 'Takrar', 'ayahId' => '2:256', 'repeatCount' => 1],
                ],
            ],
            'stats' => [
                'sessions_completed' => 4,
                'ayahs_memorised' => 1,
                'streak' => 3,
                'average_session_time' => 7,
                'total_session_seconds' => 1680,
            ],
        ];
    }

    public function test_learning_endpoints_require_authentication(): void
    {
        $this->getJson('/api/session')->assertUnauthorized();
        $this->postJson('/api/state', ['state' => []])->assertUnauthorized();
        $this->postJson('/api/migrate-local-storage', ['state' => []])->assertUnauthorized();
    }

    public function test_state_sync_derives_normalised_tables(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/state', [
                'state' => $this->sampleState(),
                'meta' => ['device_id' => 'dev-1', 'device_label' => 'Test Device'],
            ])
            ->assertOk()
            ->assertJsonPath('saved', true);

        $session = UserSession::where('user_id', $user->id)->first();
        $this->assertNotNull($session);
        $this->assertSame(2, $session->surah_number);
        $this->assertSame(256, $session->ayah_number);
        $this->assertSame('beginner', $session->memorisation_mode);
        $this->assertSame(1, $session->current_step);

        $position = UserLastPosition::where('user_id', $user->id)->first();
        $this->assertNotNull($position);
        $this->assertSame(2, $position->surah_number);
        $this->assertSame(256, $position->ayah_number);

        $this->assertSame(2, MemorisationProgress::where('user_id', $user->id)->count());
        $mastered = MemorisationProgress::where('user_id', $user->id)
            ->where('surah_number', 2)->where('ayah_number', 255)->first();
        $this->assertSame('mastered', $mastered->status);
        $this->assertSame(100, $mastered->mastery_level);
        $this->assertSame(12, $mastered->repetitions);
        $this->assertNotNull($mastered->completed_at);

        $analytics = LearningAnalytic::where('user_id', $user->id)->first();
        $this->assertNotNull($analytics);
        $this->assertSame(4, $analytics->sessions_completed);
        $this->assertSame(28, $analytics->total_minutes);
        $this->assertSame(3, $analytics->streak_day);
    }

    public function test_state_sync_is_idempotent(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 3) as $i) {
            $this->actingAs($user)
                ->postJson('/api/state', ['state' => $this->sampleState()])
                ->assertOk();
        }

        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
        $this->assertSame(1, UserLastPosition::where('user_id', $user->id)->count());
        $this->assertSame(2, MemorisationProgress::where('user_id', $user->id)->count());
        $this->assertSame(1, LearningAnalytic::where('user_id', $user->id)->count());
    }

    public function test_migration_only_imports_when_backend_empty(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/migrate-local-storage', ['state' => $this->sampleState()])
            ->assertOk()
            ->assertJsonPath('migrated', true);

        // Second attempt must not clobber existing backend data.
        $this->actingAs($user)
            ->postJson('/api/migrate-local-storage', ['state' => ['ayahs' => []]])
            ->assertOk()
            ->assertJsonPath('migrated', false)
            ->assertJsonPath('already_migrated', true);

        $this->assertSame(2, MemorisationProgress::where('user_id', $user->id)->count());
    }

    public function test_granular_endpoints_round_trip(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/continue', [
            'surah_number' => 18,
            'ayah_number' => 10,
            'last_step' => 3,
        ])->assertOk();

        $this->actingAs($user)->getJson('/api/continue')
            ->assertOk()
            ->assertJsonPath('position.surah_number', 18)
            ->assertJsonPath('position.ayah_number', 10);

        $this->actingAs($user)->postJson('/api/progress', [
            'items' => [
                ['surah_number' => 1, 'ayah_number' => 1, 'status' => 'mastered', 'mastery_level' => 100, 'repetitions' => 9],
            ],
        ])->assertOk()->assertJsonPath('count', 1);

        $this->actingAs($user)->getJson('/api/progress')
            ->assertOk()
            ->assertJsonPath('progress.0.status', 'mastered');

        $this->actingAs($user)->postJson('/api/analytics', [
            'sessions_completed' => 2,
            'total_minutes' => 15,
            'streak_day' => 1,
        ])->assertOk();

        $this->actingAs($user)->getJson('/api/analytics')
            ->assertOk()
            ->assertJsonPath('analytics.0.sessions_completed', 2);
    }

    public function test_progress_rejects_invalid_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/progress', [
            'items' => [
                ['surah_number' => 1, 'ayah_number' => 1, 'status' => 'bogus'],
            ],
        ])->assertStatus(422);
    }
}
