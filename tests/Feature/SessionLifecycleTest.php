<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_unfinished_session_endpoint(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now(),
            'metadata' => ['active' => true],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.surah_number', 1);
    }

    public function test_completed_session_is_not_returned_as_current(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 5,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session', null);
    }

    public function test_start_is_idempotent_for_existing_unfinished_session(): void
    {
        $user = User::factory()->create();

        $first = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 1,
                'ayah_number' => 1,
                'memorisation_mode' => 'beginner',
                'idempotency_key' => 'start-1',
            ])
            ->assertOk()
            ->json('session.id');

        $second = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 1,
                'ayah_number' => 2,
                'memorisation_mode' => 'beginner',
                'idempotency_key' => 'start-1',
            ])
            ->assertOk()
            ->json('session.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
        $this->assertSame(UserSessionStatus::Active, UserSession::first()->status);
    }

    public function test_resume_rejects_when_no_unfinished_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/session/resume', [])
            ->assertStatus(422);
    }

    public function test_resume_then_end_is_idempotent(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 3,
            'ayah_number' => 10,
            'status' => UserSessionStatus::Interrupted,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => ['active' => true],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/resume', [])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value);

        $this->actingAs($user)
            ->postJson('/api/session/end', ['idempotency_key' => 'end-1'])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::Completed->value);

        $this->actingAs($user)
            ->postJson('/api/session/end', ['idempotency_key' => 'end-1'])
            ->assertOk()
            ->assertJsonPath('session.status', UserSessionStatus::Completed->value);

        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
    }

    public function test_onboarding_example_is_never_resumable(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => true,
            'last_activity_at' => now(),
            'metadata' => ['active' => true, 'sessionKind' => 'sample'],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session', null);

        $this->actingAs($user)
            ->postJson('/api/session', ['action' => 'discard_example'])
            ->assertOk();

        $session = UserSession::where('user_id', $user->id)->first();
        $this->assertNotNull($session);
        $this->assertFalse((bool) $session->is_onboarding_example);
        $this->assertSame(UserSessionStatus::None, $session->status);
    }

    public function test_user_cannot_view_another_users_session(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $owner->id,
            'surah_number' => 4,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active,
            'last_activity_at' => now(),
        ]);

        $this->actingAs($intruder)
            ->getJson('/api/session')
            ->assertOk()
            ->assertJsonPath('session', null);

        $this->assertTrue($session->user_id !== $intruder->id);
    }

    public function test_state_sync_derives_explicit_session_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/state', [
                'state' => [
                    'version' => 1,
                    'ayahs' => [],
                    'sessionState' => [
                        'active' => true,
                        'mode' => 'beginner',
                        'phase' => 'Takrar',
                        'current_index' => 0,
                        'started_at' => now()->subMinutes(2)->toIso8601String(),
                        'updated_at' => now()->toIso8601String(),
                        'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
                        'queue' => [
                            ['phase' => 'Takrar', 'ayahId' => '1:1', 'repeatCount' => 1],
                        ],
                    ],
                    'stats' => [],
                ],
            ])
            ->assertOk();

        $session = UserSession::where('user_id', $user->id)->first();
        $this->assertNotNull($session);
        $this->assertSame(UserSessionStatus::Active, $session->status);
        $this->assertFalse((bool) $session->is_onboarding_example);
    }
}
