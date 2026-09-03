<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\User;
use App\Models\UserSession;
use App\Support\SessionDefaults;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_incomplete_range_ends_as_ended_early_not_completed(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => true,
                'config' => [
                    'chapterId' => 2,
                    'rangeStart' => 1,
                    'rangeEnd' => 7,
                ],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'end-early-1',
                'range_complete' => false,
                'ayah_number' => 1,
                'metadata' => [
                    'completed' => false,
                    'range_complete' => false,
                    'ended_early' => true,
                    'covered_through' => 1,
                    'config' => [
                        'chapterId' => 2,
                        'rangeStart' => 1,
                        'rangeEnd' => 7,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::EndedEarly->value)
            ->assertJsonPath('session.metadata.completed', false)
            ->assertJsonPath('session.metadata.ended_early', true);

        $this->assertSame(0, UserSession::where('user_id', $user->id)
            ->where('status', UserSessionStatus::Completed->value)
            ->count());
    }

    public function test_complete_range_ends_as_completed(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => true,
                'config' => [
                    'chapterId' => 1,
                    'rangeStart' => 1,
                    'rangeEnd' => 7,
                ],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'end-complete-1',
                'range_complete' => true,
                'ayah_number' => 7,
                'metadata' => [
                    'completed' => true,
                    'range_complete' => true,
                    'covered_through' => 7,
                    'config' => [
                        'chapterId' => 1,
                        'rangeStart' => 1,
                        'rangeEnd' => 7,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::Completed->value)
            ->assertJsonPath('session.metadata.completed', true);
    }

    public function test_completed_session_defaults_repetitions_to_one_when_unset(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => true,
                'config' => [
                    'chapterId' => 1,
                    'rangeStart' => 1,
                    'rangeEnd' => 7,
                ],
            ],
        ]);

        $session = $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'end-reps-default-1',
                'range_complete' => true,
                'ayah_number' => 7,
                'metadata' => [
                    'completed' => true,
                    'range_complete' => true,
                    'covered_through' => 7,
                    'config' => [
                        'chapterId' => 1,
                        'rangeStart' => 1,
                        'rangeEnd' => 7,
                    ],
                ],
            ])
            ->assertOk()
            ->json('session');

        $this->assertSame(SessionDefaults::REPETITIONS, (int) data_get($session, 'completion_settings.repetitions'));
        $this->assertSame(1, (int) data_get($session, 'completion_settings.repetitions'));
        $this->assertNotSame(2, (int) data_get($session, 'completion_settings.repetitions'));
    }

    public function test_completed_session_keeps_explicit_repetitions(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => true,
                'config' => [
                    'chapterId' => 1,
                    'rangeStart' => 1,
                    'rangeEnd' => 7,
                    'repetitionsPerStep' => 4,
                ],
            ],
        ]);

        $session = $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'end-reps-keep-4',
                'range_complete' => true,
                'ayah_number' => 7,
                'metadata' => [
                    'completed' => true,
                    'range_complete' => true,
                    'covered_through' => 7,
                    'config' => [
                        'chapterId' => 1,
                        'rangeStart' => 1,
                        'rangeEnd' => 7,
                        'repetitionsPerStep' => 4,
                    ],
                ],
            ])
            ->assertOk()
            ->json('session');

        $this->assertSame(4, (int) data_get($session, 'completion_settings.repetitions'));
    }

    public function test_end_without_unfinished_session_does_not_create_ghost(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/session/end', ['idempotency_key' => 'end-orphan'])
            ->assertStatus(422);

        $this->assertSame(0, UserSession::where('user_id', $user->id)->count());
    }

    public function test_end_accepts_completed_session_missing_ended_at(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => null,
            'last_activity_at' => now(),
            'started_at' => now()->subMinutes(2),
            'metadata' => [
                'active' => false,
                'completed' => true,
                'config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 3],
            ],
        ]);

        $response = $this->actingAs($user)
            ->postJson('/api/session/end', ['idempotency_key' => 'end-missing-ended-at'])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.id', $session->id);

        $this->assertNotNull($session->fresh()->ended_at);
        $this->assertNotNull($response->json('recommendation'));
        $this->assertSame(112, (int) data_get($response->json('recommendation'), 'surah.id'));
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

    public function test_state_sync_does_not_complete_paused_session_with_stale_completed_at(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 4,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'paused_at' => now()->subMinute(),
            'last_activity_at' => now()->subMinute(),
            'started_at' => now()->subMinutes(5),
            'metadata' => [
                'paused' => true,
                'active' => false,
                'completed' => false,
                'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/state', [
                'state' => [
                    'version' => 1,
                    'ayahs' => [],
                    'sessionState' => [
                        'active' => false,
                        'paused' => true,
                        // Stale leftover from a previous attempt — must not end the pause.
                        'completed_at' => now()->subHour()->toIso8601String(),
                        'mode' => 'beginner',
                        'phase' => 'Takrar',
                        'current_index' => 3,
                        'started_at' => now()->subMinutes(5)->toIso8601String(),
                        'updated_at' => now()->toIso8601String(),
                        'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
                        'queue' => [
                            ['phase' => 'Takrar', 'ayahId' => '1:4', 'repeatCount' => 1],
                        ],
                    ],
                    'stats' => [],
                ],
            ])
            ->assertOk();

        $session = UserSession::where('user_id', $user->id)->latest('id')->first();
        $this->assertSame(UserSessionStatus::Paused, $session->status);
        $this->assertNull($session->ended_at);
        $this->assertFalse((bool) data_get($session->metadata, 'completed'));

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);
    }

    public function test_start_idempotency_key_alias_is_honoured(): void
    {
        $user = User::factory()->create();

        $first = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 1,
                'ayah_number' => 1,
                'idempotency_key' => 'client-start-1',
            ])
            ->assertOk()
            ->json('session.id');

        $second = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 2,
                'ayah_number' => 5,
                'idempotency_key' => 'client-start-1',
            ])
            ->assertOk()
            ->json('session.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
    }

    public function test_pause_marks_session_paused_but_not_completed(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => ['active' => true],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/pause', ['idempotency_key' => 'pause-1'])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);

        $session = UserSession::where('user_id', $user->id)->first();
        $this->assertSame(UserSessionStatus::Paused, $session->status);
        $this->assertNotNull($session->paused_at);
        $this->assertNull($session->ended_at);
        $this->assertFalse((bool) data_get($session->metadata, 'completed'));

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);
    }

    public function test_soft_exit_pause_keeps_session_unfinished_and_resumable(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => true,
                'config' => [
                    'chapterId' => 112,
                    'rangeStart' => 1,
                    'rangeEnd' => 4,
                ],
            ],
        ]);

        // Soft exit ("Finish for now?" / return later) must pause — never terminal-end.
        $this->actingAs($user)
            ->postJson('/api/session/pause', [
                'idempotency_key' => 'soft-exit-1',
                'surah_number' => 112,
                'ayah_number' => 2,
                'metadata' => [
                    'active' => false,
                    'paused' => true,
                    'completed' => false,
                    'ended_early' => false,
                    'save_for_later' => true,
                    'config' => [
                        'chapterId' => 112,
                        'rangeStart' => 1,
                        'rangeEnd' => 4,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value)
            ->assertJsonPath('session.surah_number', 112)
            ->assertJsonPath('session.ayah_number', 2);

        $this->actingAs($user)
            ->postJson('/api/session/resume', [])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value);

        // Explicit discard (terminal incomplete) clears unfinished / Resume.
        $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'discard-soft-exit-1',
                'range_complete' => false,
                'metadata' => [
                    'completed' => false,
                    'range_complete' => false,
                    'ended_early' => true,
                    'discarded' => true,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::EndedEarly->value);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', false);

        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
    }

    public function test_paused_session_with_stale_completed_at_metadata_remains_unfinished(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 4,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'paused_at' => now()->subMinute(),
            'last_activity_at' => now(),
            'started_at' => now()->subMinutes(5),
            'metadata' => [
                'active' => false,
                'paused' => true,
                'completed' => false,
                'completed_at' => now()->subDay()->toIso8601String(),
                'config' => ['chapterId' => 1, 'rangeStart' => 4, 'rangeEnd' => 6],
            ],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value)
            ->assertJsonPath('session.surah_number', 1);
    }

    public function test_resume_after_pause_reactivates_session(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 5,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'paused_at' => now()->subMinute(),
            'last_activity_at' => now()->subMinute(),
            'started_at' => now()->subMinutes(2),
            'metadata' => ['active' => false, 'paused' => true],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/resume', [])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value);

        $session = UserSession::where('user_id', $user->id)->first();
        $this->assertSame(UserSessionStatus::Active, $session->status);
        $this->assertNull($session->paused_at);
        $this->assertNotNull($session->resumed_at);
    }

    public function test_none_status_with_progress_is_treated_as_unfinished(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 7,
            'status' => UserSessionStatus::None,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => false,
                'completed' => false,
                'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
            ],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.surah_number', 1)
            ->assertJsonPath('session.ayah_number', 7);
    }

    public function test_completed_session_cannot_be_paused_or_resumed(): void
    {
        $user = User::factory()->create();
        UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 7,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/pause', [])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('already_idle', true);

        $this->actingAs($user)
            ->postJson('/api/session/resume', [])
            ->assertStatus(422);

        $this->assertSame(UserSessionStatus::Completed, UserSession::where('user_id', $user->id)->first()->status);
    }

    public function test_start_slims_queue_verse_objects_from_metadata(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 1,
                'ayah_number' => 1,
                'idempotency_key' => 'slim-start',
                'metadata' => [
                    'active' => true,
                    'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
                    'queue' => [
                        [
                            'phase' => 'Takrar',
                            'ayahId' => '1:1',
                            'repeatCount' => 1,
                            'verse' => [
                                'key' => '1:1',
                                'text' => str_repeat('ayah ', 200),
                                'words' => range(1, 50),
                            ],
                        ],
                    ],
                ],
            ])
            ->assertOk();

        $meta = UserSession::query()->where('user_id', $user->id)->first()?->metadata;
        $this->assertIsArray($meta);
        $this->assertSame('1:1', $meta['queue'][0]['ayahId']);
        $this->assertArrayNotHasKey('verse', $meta['queue'][0]);
    }

    public function test_legacy_frontend_status_does_not_500_on_start(): void
    {
        $user = User::factory()->create();
        DB::table('user_sessions')->insert([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 1,
            'status' => 'interrupted_resumable',
            'is_onboarding_example' => 0,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => json_encode(['active' => true, 'config' => ['chapterId' => 2]]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 2,
                'ayah_number' => 1,
                'idempotency_key' => 'legacy-status-start',
            ])
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value);

        $this->assertSame(1, UserSession::query()->where('user_id', $user->id)->count());
        $session = UserSession::query()->where('user_id', $user->id)->first();
        $this->assertSame(UserSessionStatus::Active, $session->status);
    }

    public function test_start_after_complete_with_same_idempotency_key_creates_new_session(): void
    {
        $user = User::factory()->create();

        $firstId = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 113,
                'ayah_number' => 1,
                'idempotency_key' => 'start-18-113-1-5',
                'metadata' => [
                    'config' => ['chapterId' => 113, 'rangeStart' => 1, 'rangeEnd' => 5],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->json('session.id');

        $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'end-after-start-1',
                'range_complete' => true,
                'session_id' => $firstId,
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::Completed->value);

        $secondId = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 113,
                'ayah_number' => 1,
                'idempotency_key' => 'start-18-113-1-5',
                'metadata' => [
                    'config' => ['chapterId' => 113, 'rangeStart' => 1, 'rangeEnd' => 5],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value)
            ->json('session.id');

        $this->assertNotSame($firstId, $secondId);
        $this->assertSame(2, UserSession::where('user_id', $user->id)->count());
        $this->assertSame(
            UserSessionStatus::Completed,
            UserSession::find($firstId)?->status
        );
        $this->assertNull(UserSession::find($firstId)?->start_idempotency_key);
    }

    public function test_duplicate_start_clicks_reuse_same_unfinished_session(): void
    {
        $user = User::factory()->create();

        $first = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 1,
                'ayah_number' => 1,
                'idempotency_key' => 'dup-click-start',
            ])
            ->assertOk()
            ->json('session.id');

        $second = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 1,
                'ayah_number' => 1,
                'idempotency_key' => 'dup-click-start',
            ])
            ->assertOk()
            ->json('session.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
    }

    public function test_pause_exit_resume_complete_have_distinct_states(): void
    {
        $user = User::factory()->create();

        $sessionId = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 2,
                'ayah_number' => 1,
                'idempotency_key' => 'lifecycle-distinct-1',
                'metadata' => [
                    'config' => ['chapterId' => 2, 'rangeStart' => 1, 'rangeEnd' => 7],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('session.status', UserSessionStatus::Active->value)
            ->json('session.id');

        $this->actingAs($user)
            ->postJson('/api/session/pause', [
                'session_id' => $sessionId,
                'idempotency_key' => 'pause-distinct-1',
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);

        $this->actingAs($user)
            ->getJson('/api/session/current?id='.$sessionId)
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);

        $this->actingAs($user)
            ->postJson('/api/session/resume', [
                'session_id' => $sessionId,
                'idempotency_key' => 'resume-distinct-1',
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value);

        $this->actingAs($user)
            ->postJson('/api/session/end', [
                'session_id' => $sessionId,
                'idempotency_key' => 'end-distinct-1',
                'range_complete' => true,
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::Completed->value);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session', null);
    }

    public function test_invalid_session_id_fails_safely_on_resume_and_current(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/session/current?id=999999')
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('invalid_requested', true)
            ->assertJsonPath('session', null);

        $this->actingAs($user)
            ->postJson('/api/session/resume', ['session_id' => 999999])
            ->assertStatus(422);

        $this->actingAs($user)
            ->getJson('/api/session?id=999999')
            ->assertOk()
            ->assertJsonPath('found', false)
            ->assertJsonPath('session', null);
    }

    public function test_completed_session_is_not_returned_as_unfinished_when_requested_by_id(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 4,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true, 'config' => ['chapterId' => 4]],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current?id='.$session->id)
            ->assertOk()
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('invalid_requested', true)
            ->assertJsonPath('session', null);

        $this->actingAs($user)
            ->getJson('/api/session?id='.$session->id)
            ->assertOk()
            ->assertJsonPath('found', true)
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session.status', UserSessionStatus::Completed->value);
    }

    public function test_end_without_unfinished_session_is_recoverable_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/session/end', [
                'idempotency_key' => 'end-missing-1',
                'range_complete' => false,
            ])
            ->assertStatus(422);
    }

    public function test_refresh_style_current_after_pause_keeps_resumable_state(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 18,
            'ayah_number' => 3,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'paused_at' => now(),
            'last_activity_at' => now(),
            'started_at' => now()->subMinutes(2),
            'metadata' => [
                'active' => false,
                'paused' => true,
                'config' => [
                    'chapterId' => 18,
                    'rangeStart' => 1,
                    'rangeEnd' => 10,
                    'reciterId' => 'ar.alafasy',
                    'repetitionsPerStep' => 3,
                ],
            ],
        ]);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.id', $session->id)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value)
            ->assertJsonPath('session.metadata.config.chapterId', 18)
            ->assertJsonPath('session.metadata.config.rangeStart', 1)
            ->assertJsonPath('session.metadata.config.rangeEnd', 10);
    }

    public function test_mid_session_checkpoint_updates_progress_without_completing(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'current_step' => 0,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'repetitions_completed' => 0,
            'last_activity_at' => now()->subMinute(),
            'started_at' => now()->subMinutes(5),
            'metadata' => [
                'active' => true,
                'client_revision' => 1,
                'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session', [
                'action' => 'save',
                'session_id' => $session->id,
                'surah_number' => 1,
                'ayah_number' => 4,
                'current_step' => 3,
                'repetitions_completed' => 2,
                'client_revision' => 2,
                'last_activity_at' => now()->toIso8601String(),
                'metadata' => [
                    'active' => true,
                    'paused' => false,
                    'completed' => false,
                    'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 7],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.ayah_number', 4)
            ->assertJsonPath('session.current_step', 3)
            ->assertJsonPath('session.repetitions_completed', 2)
            ->assertJsonPath('session.status', UserSessionStatus::Active->value);

        $fresh = $session->fresh();
        $this->assertSame(UserSessionStatus::Active, $fresh->status);
        $this->assertNull($fresh->ended_at);
        $this->assertSame(2, (int) ($fresh->metadata['client_revision'] ?? 0));
    }

    public function test_mid_session_save_does_not_create_session_when_none_unfinished(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/session', [
                'action' => 'save',
                'ayah_number' => 2,
                'client_revision' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('saved', false)
            ->assertJsonPath('unfinished', false)
            ->assertJsonPath('session', null);

        $this->assertSame(0, UserSession::where('user_id', $user->id)->count());
    }

    public function test_mid_session_save_rejects_stale_client_revision(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'ayah_number' => 10,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinutes(3),
            'metadata' => [
                'active' => true,
                'client_revision' => 5,
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session', [
                'action' => 'save',
                'session_id' => $session->id,
                'ayah_number' => 1,
                'client_revision' => 3,
            ])
            ->assertStatus(409)
            ->assertJsonPath('saved', false)
            ->assertJsonPath('stale', true);

        $this->assertSame(10, (int) $session->fresh()->ayah_number);
    }

    public function test_mid_session_save_conflicts_on_invalid_session_id(): void
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
            ->postJson('/api/session', [
                'action' => 'save',
                'session_id' => 999999,
                'ayah_number' => 2,
                'client_revision' => 1,
            ])
            ->assertStatus(409)
            ->assertJsonPath('saved', false)
            ->assertJsonPath('conflict', true);

        $this->assertSame(1, UserSession::where('user_id', $user->id)->count());
    }

    public function test_keepalive_style_pause_leaves_resumable_unfinished_session(): void
    {
        $user = User::factory()->create();
        $session = UserSession::create([
            'user_id' => $user->id,
            'surah_number' => 18,
            'ayah_number' => 2,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'started_at' => now()->subMinute(),
            'metadata' => [
                'active' => true,
                'config' => ['chapterId' => 18, 'rangeStart' => 1, 'rangeEnd' => 10],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/session/pause', [
                'session_id' => $session->id,
                'ayah_number' => 5,
                'current_step' => 4,
                'metadata' => [
                    'active' => false,
                    'paused' => true,
                    'completed' => false,
                    'config' => ['chapterId' => 18, 'rangeStart' => 1, 'rangeEnd' => 10],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertJsonPath('unfinished', true)
            ->assertJsonPath('session.id', $session->id)
            ->assertJsonPath('session.status', UserSessionStatus::Paused->value);
    }
}
