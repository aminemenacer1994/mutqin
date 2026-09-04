<?php

namespace Tests\Feature;

use App\Enums\RecommendationStatus;
use App\Enums\UserSessionStatus;
use App\Models\AyahNote;
use App\Models\HifzPlan;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cross-user authorization: forging IDs / user_id must never expose or mutate
 * another learner's dashboard, sessions, progress, recommendations, notes, or state.
 */
class LearnerResourceAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_ignores_forged_user_id_and_hides_other_users_stats(): void
    {
        $userA = User::factory()->create(['name' => 'User A']);
        $userB = User::factory()->create(['name' => 'User B']);

        UserSession::create([
            'user_id' => $userA->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => ['completed' => true],
        ]);

        $this->actingAs($userB)
            ->getJson('/api/dashboard?user_id='.$userA->id)
            ->assertOk()
            ->assertJsonPath('data.meta.owner_id', $userB->id)
            ->assertJsonPath('data.snapshot.completed_sessions.value', 0);

        $this->actingAs($userA)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.meta.owner_id', $userA->id)
            ->assertJsonPath('data.snapshot.completed_sessions.value', 1);
    }

    public function test_session_lookup_by_id_cannot_fetch_another_users_session(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $session = UserSession::create([
            'user_id' => $owner->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Paused,
            'is_onboarding_example' => false,
            'last_activity_at' => now(),
            'metadata' => ['active' => false, 'paused' => true],
        ]);

        $this->actingAs($intruder)
            ->getJson('/api/session?id='.$session->id)
            ->assertOk()
            ->assertJsonPath('found', false)
            ->assertJsonPath('session', null);
    }

    public function test_session_start_cannot_reassign_user_id_from_request_body(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/session/start', [
                'surah_number' => 114,
                'ayah_number' => 1,
                'user_id' => $other->id,
                'metadata' => [
                    'config' => [
                        'chapterId' => 114,
                        'rangeStart' => 1,
                        'rangeEnd' => 6,
                    ],
                ],
            ])
            ->assertOk();

        $sessionId = (int) $response->json('session.id');
        $this->assertGreaterThan(0, $sessionId);
        $this->assertDatabaseHas('user_sessions', [
            'id' => $sessionId,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseMissing('user_sessions', [
            'id' => $sessionId,
            'user_id' => $other->id,
        ]);
    }

    public function test_progress_and_continue_are_owner_scoped_despite_client_user_id(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        MemorisationProgress::query()->create([
            'user_id' => $owner->id,
            'surah_number' => 2,
            'ayah_number' => 255,
            'status' => 'mastered',
            'mastery_level' => 5,
            'repetitions' => 8,
        ]);

        UserLastPosition::query()->create([
            'user_id' => $owner->id,
            'surah_number' => 2,
            'ayah_number' => 255,
            'last_step' => 3,
            'last_opened_at' => now(),
            'metadata' => ['mode' => 'advanced'],
        ]);

        $this->actingAs($intruder)
            ->getJson('/api/progress?user_id='.$owner->id)
            ->assertOk()
            ->assertJsonCount(0, 'progress');

        $this->actingAs($intruder)
            ->getJson('/api/continue?user_id='.$owner->id)
            ->assertOk()
            ->assertJsonPath('position', null);
    }

    public function test_state_sync_cannot_read_or_overwrite_another_users_blob(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        MemorisationSyncState::query()->create([
            'user_id' => $owner->id,
            'state' => json_encode(['secret' => 'owner-only', 'stats' => ['sessions_completed' => 9]], JSON_UNESCAPED_UNICODE),
            'payload_hash' => 'owner-hash',
            'state_updated_at' => now(),
        ]);

        $this->actingAs($intruder)
            ->getJson('/api/state?user_id='.$owner->id)
            ->assertOk()
            ->assertJsonPath('meta.owner_id', $intruder->id)
            ->assertJsonPath('state', null);

        $this->actingAs($intruder)
            ->postJson('/api/state', [
                'state' => ['secret' => 'intruder', 'stats' => ['sessions_completed' => 1]],
                'meta' => ['local_updated_at' => now()->toIso8601String()],
            ])
            ->assertOk();

        $ownerState = MemorisationSyncState::query()->where('user_id', $owner->id)->first();
        $this->assertNotNull($ownerState);
        $decoded = json_decode((string) $ownerState->state, true);
        $this->assertSame('owner-only', $decoded['secret'] ?? null);
        $this->assertSame(9, $decoded['stats']['sessions_completed'] ?? null);

        $intruderState = MemorisationSyncState::query()->where('user_id', $intruder->id)->first();
        $this->assertNotNull($intruderState);
        $intruderDecoded = json_decode((string) $intruderState->state, true);
        $this->assertSame('intruder', $intruderDecoded['secret'] ?? null);
    }

    public function test_recommendation_and_ayah_note_cannot_be_fetched_by_forged_id(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $recommendation = SessionRecommendation::create([
            'user_id' => $owner->id,
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'recommendation_type' => 'revision',
            'reason_code' => 'performance_review',
            'status' => RecommendationStatus::Generated,
            'session_mode' => 'revision',
        ]);

        $note = AyahNote::query()->create([
            'user_id' => $owner->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'body' => 'Owner private note',
        ]);

        $this->actingAs($intruder)
            ->postJson('/api/recommendations/reject', [
                'recommendation_id' => $recommendation->id,
            ])
            ->assertNotFound();

        $this->actingAs($intruder)
            ->putJson('/api/ayah-notes/'.$note->id, ['body' => 'hijack'])
            ->assertNotFound();

        $this->assertDatabaseHas('ayah_notes', [
            'id' => $note->id,
            'body' => 'Owner private note',
        ]);
    }

    public function test_hifz_plan_and_assessment_detail_are_inaccessible_to_other_users(): void
    {
        $owner = User::factory()->pro()->create();
        $intruder = User::factory()->create();

        HifzPlan::query()->create([
            'user_id' => $owner->id,
            'config' => ['goalSettings' => ['goal' => 'balanced']],
            'status' => 'active',
        ]);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $owner->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => 'completed',
            'completion_state' => 'completed',
            'overall_accuracy' => 90,
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => ['weak_ayahs' => []],
        ]);

        $this->actingAs($intruder)
            ->getJson('/api/hifz-plan?user_id='.$owner->id)
            ->assertOk()
            ->assertJsonPath('plan', null);

        $this->actingAs($intruder)
            ->getJson('/api/memorisation/assessments/'.$assessment->id)
            ->assertForbidden();

        $session = UserSession::create([
            'user_id' => $owner->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now(),
            'last_activity_at' => now(),
            'metadata' => [
                'completed' => true,
                'config' => ['chapterId' => 1, 'rangeStart' => 1, 'rangeEnd' => 1],
            ],
        ]);

        $this->actingAs($intruder)
            ->getJson('/api/sessions/'.$session->id.'/analysis')
            ->assertNotFound();
    }

    public function test_demo_accounts_remain_isolated_after_account_switch_simulation(): void
    {
        $userA = User::factory()->create(['email' => 'demo.a@mutqin.test']);
        $userB = User::factory()->create(['email' => 'demo.b@mutqin.test']);

        UserSession::create([
            'user_id' => $userA->id,
            'surah_number' => 108,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'metadata' => ['completed' => true, 'label' => 'A-only'],
        ]);

        MemorisationSyncState::query()->create([
            'user_id' => $userA->id,
            'state' => json_encode(['workspaceState' => ['continueSession' => ['config' => ['chapterId' => 108]]]], JSON_UNESCAPED_UNICODE),
            'payload_hash' => 'a-hash',
            'state_updated_at' => now(),
        ]);

        // B logs in — must see empty dashboard / state.
        $this->actingAs($userB)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.meta.owner_id', $userB->id)
            ->assertJsonPath('data.snapshot.completed_sessions.value', 0);

        $this->actingAs($userB)
            ->getJson('/api/state')
            ->assertOk()
            ->assertJsonPath('meta.owner_id', $userB->id)
            ->assertJsonPath('state', null);

        // A returns — data still intact and only visible to A.
        $this->actingAs($userA)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.meta.owner_id', $userA->id)
            ->assertJsonPath('data.snapshot.completed_sessions.value', 1);

        $this->actingAs($userA)
            ->getJson('/api/state')
            ->assertOk()
            ->assertJsonPath('meta.owner_id', $userA->id)
            ->assertJsonPath('state.workspaceState.continueSession.config.chapterId', 108);
    }
}
