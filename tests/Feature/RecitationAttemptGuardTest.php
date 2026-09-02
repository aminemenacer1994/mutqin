<?php

namespace Tests\Feature;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Services\Memorisation\RecitationAttemptClassifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecitationAttemptGuardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function basePayload(array $overrides = []): array
    {
        return array_merge([
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
            'duration_ms' => 5000,
            'provider' => 'speechmatics',
            'ayahs' => [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله', 'الرحمن', 'الرحيم'],
            ]],
        ], $overrides);
    }

    public function test_silence_does_not_score_or_create_a_plan(): void
    {
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'recognition_words' => [],
            'transcript' => '',
            'idempotency_key' => 'silence-1',
        ]));

        $response->assertCreated()
            ->assertJsonPath('invalid_attempt', true)
            ->assertJsonPath('attempt_class', RecitationAttemptClassifier::SILENCE_NO_SPEECH)
            ->assertJsonPath('assessment.status', 'failed')
            ->assertJsonPath('assessment.accuracy', null)
            ->assertJsonPath('practice_plan', null);

        $this->assertSame(0, MemorisationPracticePlan::query()->where('user_id', $user->id)->count());
        $this->assertSame(0, MemorisationProgress::query()->where('user_id', $user->id)->count());
        $this->assertDatabaseHas('memorisation_assessments', [
            'user_id' => $user->id,
            'status' => MemorisationAssessment::STATUS_FAILED,
            'overall_accuracy' => null,
        ]);
    }

    public function test_too_short_and_empty_transcript_are_failed_not_weak(): void
    {
        $user = User::factory()->pro()->create();

        $short = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'duration_ms' => 400,
            'recognition_words' => [['word' => 'بسم', 'confidence' => 0.9]],
            'idempotency_key' => 'short-1',
        ]));
        $short->assertCreated()
            ->assertJsonPath('invalid_attempt', true)
            ->assertJsonPath('attempt_class', RecitationAttemptClassifier::RECORDING_TOO_SHORT)
            ->assertJsonPath('assessment.status', 'failed');

        $empty = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'duration_ms' => null,
            'recognition_words' => [],
            'transcript' => '',
            'idempotency_key' => 'empty-1',
        ]));
        $empty->assertCreated()
            ->assertJsonPath('attempt_class', RecitationAttemptClassifier::EMPTY_LOW_CONFIDENCE_TRANSCRIPT)
            ->assertJsonPath('assessment.accuracy', null);
    }

    public function test_low_confidence_and_provider_failures_are_excluded_from_scoring(): void
    {
        $user = User::factory()->pro()->create();

        $low = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'recognition_words' => [
                ['word' => 'xyz', 'confidence' => 0.1],
                ['word' => 'abc', 'confidence' => 0.12],
            ],
            'idempotency_key' => 'low-1',
        ]));
        $low->assertCreated()
            ->assertJsonPath('invalid_attempt', true)
            ->assertJsonPath('attempt_class', RecitationAttemptClassifier::EMPTY_LOW_CONFIDENCE_TRANSCRIPT);

        $timeout = $this->actingAs($user)->postJson('/api/memorisation/assessments/failed', [
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'failure_reason' => 'timeout',
            'provider' => 'speechmatics',
            'provider_status' => 504,
        ]);
        $timeout->assertCreated()
            ->assertJsonPath('assessment.status', 'failed')
            ->assertJsonPath('assessment.attempt_class', RecitationAttemptClassifier::PROVIDER_NETWORK_ERROR)
            ->assertJsonPath('assessment.accuracy', null);

        $provider = $this->actingAs($user)->postJson('/api/memorisation/assessments/failed', [
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'failure_reason' => 'provider',
            'provider_status' => 503,
        ]);
        $provider->assertCreated()
            ->assertJsonPath('assessment.attempt_class', RecitationAttemptClassifier::PROVIDER_NETWORK_ERROR);

        $this->assertSame(0, MemorisationProgress::query()->where('user_id', $user->id)->count());
    }

    public function test_microphone_denied_and_cancelled_attempts_do_not_mutate_progress(): void
    {
        $user = User::factory()->pro()->create();

        $mic = $this->actingAs($user)->postJson('/api/memorisation/assessments/failed', [
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'failure_reason' => 'mic_permission',
        ]);
        $mic->assertCreated()
            ->assertJsonPath('assessment.attempt_class', RecitationAttemptClassifier::MICROPHONE_DENIED);

        $cancelled = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'failure_reason' => 'cancelled',
            'recognition_words' => [['word' => 'بسم', 'confidence' => 0.95]],
            'idempotency_key' => 'cancel-1',
        ]));
        $cancelled->assertCreated()
            ->assertJsonPath('invalid_attempt', true)
            ->assertJsonPath('attempt_class', RecitationAttemptClassifier::CANCELLED_STALE)
            ->assertJsonPath('practice_plan', null);

        $this->assertSame(0, MemorisationPracticePlan::query()->where('user_id', $user->id)->count());
        $this->assertSame(0, MemorisationProgress::query()->where('user_id', $user->id)->count());
    }

    public function test_valid_incorrect_recitation_is_scored_as_a_real_mistake(): void
    {
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'recognition_words' => [
                ['word' => 'قل', 'confidence' => 0.94],
                ['word' => 'هو', 'confidence' => 0.93],
                ['word' => 'الله', 'confidence' => 0.92],
                ['word' => 'احد', 'confidence' => 0.91],
            ],
            'transcript' => 'قل هو الله احد',
            'idempotency_key' => 'valid-wrong-1',
        ]));

        $response->assertCreated()
            ->assertJsonMissingPath('invalid_attempt')
            ->assertJsonPath('assessment.status', 'completed')
            ->assertJsonPath('assessment.attempt_class', RecitationAttemptClassifier::VALID_CHECK);

        $accuracy = (int) $response->json('assessment.accuracy');
        $this->assertLessThan(55, $accuracy);
        $this->assertNotNull($response->json('practice_plan.id'));
        $this->assertGreaterThan(0, MemorisationProgress::query()->where('user_id', $user->id)->count());
    }

    public function test_history_accuracy_excludes_failed_checks(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'الرحمن', 'confidence' => 0.93],
                ['word' => 'الرحيم', 'confidence' => 0.92],
            ],
            'idempotency_key' => 'valid-1',
        ]))->assertCreated();

        $this->actingAs($user)->postJson('/api/memorisation/assessments', $this->basePayload([
            'recognition_words' => [],
            'transcript' => '',
            'idempotency_key' => 'invalid-1',
        ]))->assertCreated();

        $dashboard = $this->actingAs($user)->getJson('/api/memorisation/history/dashboard')->assertOk();
        $this->assertSame(1, (int) $dashboard->json('attempts.completed'));
        $this->assertSame(1, (int) $dashboard->json('attempts.failed'));
        $this->assertNotNull($dashboard->json('attempts.average_accuracy'));
        $this->assertGreaterThan(0, (int) $dashboard->json('attempts.average_accuracy'));
    }
}
