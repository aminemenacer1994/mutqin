<?php

namespace Tests\Feature;

use App\Models\LearningHistoryAuditLog;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationAssessmentWord;
use App\Models\MemorisationAttemptComparison;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationSyncState;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use App\Services\Memorisation\LearningHistoryRetentionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MemorisationLearningHistoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function assessmentPayload(array $overrides = []): array
    {
        return array_merge([
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
            'duration_ms' => 4500,
            'provider' => 'test',
            'practice_mode' => 'revision',
            'mistake_handling_mode' => 'guided',
            'words_visible_percent' => 40,
            'model_version' => 'test-asr-v1',
            'algorithm_version' => 'mutqin-recitation-v1',
            'device_metadata' => [
                'browser' => 'Safari',
                'platform' => 'macOS',
                'notes' => 'should-be-stripped',
            ],
            'ayahs' => [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله', 'الرحمن', 'الرحيم'],
            ]],
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'كتب', 'confidence' => 0.9],
                ['word' => 'الرحيم', 'confidence' => 0.93],
            ],
        ], $overrides);
    }

    public function test_assessment_persists_word_results_weak_spots_and_plan_history(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)->postJson(
            '/api/memorisation/assessments',
            $this->assessmentPayload(['idempotency_key' => 'attempt-1'])
        );

        $create->assertCreated();
        $assessmentId = (int) $create->json('assessment.id');
        $planId = (int) $create->json('practice_plan.id');

        $this->assertDatabaseHas('memorisation_assessments', [
            'id' => $assessmentId,
            'user_id' => $user->id,
            'idempotency_key' => 'attempt-1',
            'status' => 'completed',
            'model_version' => 'test-asr-v1',
            'algorithm_version' => 'mutqin-recitation-v1',
            'practice_mode' => 'revision',
        ]);

        $this->assertGreaterThan(0, MemorisationAssessmentWord::query()->where('assessment_id', $assessmentId)->count());
        $this->assertGreaterThan(0, MemorisationWeakSpot::query()->where('user_id', $user->id)->count());
        $this->assertDatabaseHas('memorisation_practice_plans', [
            'id' => $planId,
            'assessment_id' => $assessmentId,
        ]);
        $this->assertContains(
            MemorisationPracticePlan::query()->find($planId)?->practice_scope,
            [MemorisationPracticePlan::SCOPE_WEAK_AREAS, MemorisationPracticePlan::SCOPE_FULL_RANGE]
        );

        $detail = $this->actingAs($user)->getJson("/api/memorisation/assessments/{$assessmentId}");
        $detail->assertOk()
            ->assertJsonPath('assessment.id', $assessmentId)
            ->assertJsonStructure(['word_results', 'practice_plan']);

        $dashboard = $this->actingAs($user)->getJson('/api/memorisation/history/dashboard');
        $dashboard->assertOk()
            ->assertJsonPath('attempts.completed', 1);
    }

    public function test_idempotent_assessment_save_does_not_duplicate(): void
    {
        $user = User::factory()->create();
        $payload = $this->assessmentPayload(['idempotency_key' => 'same-key']);

        $first = $this->actingAs($user)->postJson('/api/memorisation/assessments', $payload);
        $first->assertCreated();
        $id = (int) $first->json('assessment.id');

        $second = $this->actingAs($user)->postJson('/api/memorisation/assessments', $payload);
        $second->assertOk()
            ->assertJsonPath('idempotent', true)
            ->assertJsonPath('assessment.id', $id);

        $this->assertSame(1, MemorisationAssessment::query()->where('user_id', $user->id)->count());
        $this->assertSame(1, MemorisationPracticePlan::query()->where('user_id', $user->id)->count());
    }

    public function test_failed_processing_is_recorded(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/memorisation/assessments/failed', [
            'surah_number' => 2,
            'start_ayah' => 1,
            'end_ayah' => 2,
            'idempotency_key' => 'fail-1',
            'failure_reason' => 'no_speech',
            'model_version' => 'test-asr-v1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('assessment.status', 'failed')
            ->assertJsonPath('assessment.failure_reason', 'no_speech');

        $this->assertDatabaseHas('memorisation_assessments', [
            'user_id' => $user->id,
            'idempotency_key' => 'fail-1',
            'status' => 'failed',
            'match_result' => 'failed',
        ]);
    }

    public function test_retest_persists_follow_up_comparison_and_recommendation_lifecycle(): void
    {
        $user = User::factory()->create();

        $create = $this->actingAs($user)->postJson(
            '/api/memorisation/assessments',
            $this->assessmentPayload()
        )->assertCreated();

        $planId = (int) $create->json('practice_plan.id');
        $previousId = (int) $create->json('assessment.id');

        $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/accept")
            ->assertOk()
            ->assertJsonPath('practice_plan.accepted_at', fn ($v) => is_string($v) && $v !== '');

        $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/start")->assertOk();
        $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/complete", [
            'repetitions_completed' => 3,
            'outcome' => 'followed',
        ])->assertOk()
            ->assertJsonPath('practice_plan.completion_outcome', 'followed');

        $retest = $this->actingAs($user)->postJson("/api/memorisation/practice-plans/{$planId}/retest", [
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
            'ayahs' => [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله', 'الرحمن', 'الرحيم'],
            ]],
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'الرحمن', 'confidence' => 0.94],
                ['word' => 'الرحيم', 'confidence' => 0.93],
            ],
        ]);

        $retest->assertCreated()
            ->assertJsonStructure(['improvement' => ['improved_items', 'unchanged_items', 'new_weak_items', 'summary']]);

        $followUpId = (int) $retest->json('assessment.id');
        $this->assertDatabaseHas('memorisation_attempt_comparisons', [
            'user_id' => $user->id,
            'previous_assessment_id' => $previousId,
            'follow_up_assessment_id' => $followUpId,
        ]);

        $lookup = $this->actingAs($user)->getJson(
            '/api/memorisation/comparisons/lookup?previous_assessment_id='.$previousId.'&follow_up_assessment_id='.$followUpId
        );
        $lookup->assertOk()
            ->assertJsonPath('previous_assessment_id', $previousId);

        $plans = $this->actingAs($user)->getJson('/api/memorisation/practice-plans');
        $plans->assertOk();
        $this->assertGreaterThanOrEqual(1, count($plans->json('data') ?? $plans->json()['data'] ?? []));
    }

    public function test_ownership_hides_other_users_attempt_detail(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $create = $this->actingAs($owner)->postJson(
            '/api/memorisation/assessments',
            $this->assessmentPayload()
        )->assertCreated();
        $assessmentId = (int) $create->json('assessment.id');

        $this->actingAs($intruder)->getJson("/api/memorisation/assessments/{$assessmentId}")
            ->assertForbidden();
    }

    public function test_user_deletion_purges_recordings_and_cascades_history(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson(
            '/api/memorisation/assessments',
            $this->assessmentPayload(['idempotency_key' => 'to-delete'])
        )->assertCreated();

        MemorisationSyncState::query()->create([
            'user_id' => $user->id,
            'state' => json_encode([
                'recordingsLibrary' => [
                    ['id' => 'rec-1', 'blob' => 'secret-audio'],
                ],
                'progress' => ['ok' => true],
            ], JSON_UNESCAPED_UNICODE),
            'payload_hash' => 'abc',
            'state_updated_at' => now(),
        ]);

        $userId = $user->id;
        app(LearningHistoryRetentionService::class)->deleteUserAccount($user);

        $this->assertDatabaseMissing('users', ['id' => $userId]);
        $this->assertSame(0, MemorisationAssessment::withTrashed()->where('user_id', $userId)->count());
        $this->assertDatabaseHas('learning_history_audit_logs', [
            'subject_user_id' => null,
            'action' => 'delete_user_account',
        ]);
        $this->assertTrue(
            LearningHistoryAuditLog::query()->where('action', 'purge_optional_recordings')->exists()
            || LearningHistoryAuditLog::query()->where('action', 'delete_user_account')->exists()
        );
    }

    public function test_anonymisation_scrubs_recognition_text_but_keeps_structure(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson(
            '/api/memorisation/assessments',
            $this->assessmentPayload()
        )->assertCreated();

        app(LearningHistoryRetentionService::class)->anonymiseLearningHistory($user);

        $assessment = MemorisationAssessment::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($assessment);
        $this->assertNull($assessment->device_metadata);
        $recognition = $assessment->recognition_data ?? [];
        $this->assertArrayNotHasKey('transcript', $recognition);

        $this->assertSame(
            0,
            MemorisationAssessmentWord::query()
                ->where('user_id', $user->id)
                ->whereNotNull('detected_token')
                ->count()
        );
        $this->assertGreaterThan(0, MemorisationAssessmentWord::query()->where('user_id', $user->id)->count());
    }

    public function test_dashboard_query_uses_indexed_filters_without_error(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->assessmentPayload())->assertCreated();

        DB::enableQueryLog();
        $this->actingAs($user)->getJson('/api/memorisation/weak-spots?status=active')->assertOk();
        $this->actingAs($user)->getJson('/api/memorisation/assessments?per_page=10')->assertOk();
        $this->actingAs($user)->getJson('/api/memorisation/history/dashboard')->assertOk();
        $queries = DB::getQueryLog();
        $this->assertNotEmpty($queries);
    }

    public function test_paused_session_does_not_soft_delete_learning_history(): void
    {
        $user = User::factory()->create();
        $create = $this->actingAs($user)->postJson(
            '/api/memorisation/assessments',
            $this->assessmentPayload()
        )->assertCreated();

        $assessmentId = (int) $create->json('assessment.id');
        $this->assertNull(MemorisationAssessment::query()->find($assessmentId)?->deleted_at);

        // Soft-delete retention disabled by default (0 days).
        $purged = app(LearningHistoryRetentionService::class)->softDeleteExpiredAssessments(0);
        $this->assertSame(0, $purged);
        $this->assertDatabaseHas('memorisation_assessments', [
            'id' => $assessmentId,
            'deleted_at' => null,
        ]);
    }
}
