<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgressOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_learning_counts_use_only_stored_evidence_for_the_owner(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 4,
            'status' => 'memorised',
            'completed_at' => now(),
        ]);
        MemorisationProgress::query()->create([
            'user_id' => $other->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'mastered',
            'completed_at' => now(),
        ]);

        UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'memorisation_mode' => 'revision',
            'is_onboarding_example' => false,
            'ended_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'metadata' => ['config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 3]],
        ]);
        UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 113,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'memorisation_mode' => 'beginner',
            'is_onboarding_example' => false,
            'ended_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'metadata' => ['config' => ['chapterId' => 113, 'rangeStart' => 1, 'rangeEnd' => 4]],
        ]);

        $flagged = $this->assessment($user, 1, 1, 'completed', 60, 'align-v1');
        $this->attempt($user, $flagged, 60, 'weak', [
            ['text' => 'بِسْمِ', 'status' => 'correct', 'ayah_number' => 1, 'ayah_word_index' => 0, 'confidence' => 0.9],
            ['text' => 'ٱللَّهِ', 'status' => 'wrong', 'ayah_number' => 1, 'ayah_word_index' => 1, 'recognised_word' => 'الله', 'confidence' => 0.4],
        ], now()->subHours(2));
        $clean = $this->assessment($user, 1, 1, 'completed', 100, 'align-v1');
        $this->attempt($user, $clean, 100, 'strong', [
            ['text' => 'بِسْمِ', 'status' => 'correct', 'ayah_number' => 1, 'ayah_word_index' => 0, 'confidence' => 0.95],
            ['text' => 'ٱللَّهِ', 'status' => 'correct', 'ayah_number' => 1, 'ayah_word_index' => 1, 'recognised_word' => 'ٱللَّهِ', 'confidence' => 0.93],
        ], now()->subHour());
        $failed = $this->assessment($user, 2, 1, 'failed', null, 'align-v1');
        AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'memorisation_assessment_id' => $failed->id,
            'attempt_number' => 3,
            'accuracy_percent' => null,
            'band' => null,
            'ayah_range' => ['surah' => 2, 'from' => 1, 'to' => 1],
        ]);

        MemorisationWeakSpot::query()->create([
            'user_id' => $user->id,
            'spot_type' => 'ayah',
            'surah_number' => 1,
            'ayah_number' => 1,
            'verse_key' => '1:1',
            'spot_key' => 'ayah:1:1:ayah',
            'severity' => 'high',
            'status' => 'active',
            'affected_attempt_count' => 2,
            'last_identified_at' => now()->subHours(2),
        ]);
        MemorisationWeakSpot::query()->create([
            'user_id' => $user->id,
            'spot_type' => 'ayah',
            'surah_number' => 2,
            'ayah_number' => 10,
            'verse_key' => '2:10',
            'spot_key' => 'ayah:2:10:ayah',
            'severity' => 'medium',
            'status' => 'active',
            'affected_attempt_count' => 1,
            'last_identified_at' => now()->subDay(),
        ]);

        $payload = $this->actingAs($user)->getJson('/api/dashboard?days=30')->assertOk()->json('data.learning');

        $this->assertSame(1, $payload['metrics']['memorised']['value']);
        $this->assertNull($payload['metrics']['memorised']['percent']);
        $this->assertSame(3, $payload['metrics']['revised']['value']);
        $this->assertSame(1, $payload['metrics']['recited']['value']);
        $this->assertSame(2, $payload['metrics']['ai_checks']['value']);
        $this->assertSame(80, $payload['comparable']['average']);
        $this->assertSame(100, $payload['comparable']['best']);
        $this->assertSame('align-v1', $payload['comparable']['model_version']);

        $keys = array_column($payload['revisit'], 'key');
        $this->assertNotContains('1:1', $keys);
        $this->assertContains('2:10', $keys);
        $card = collect($payload['revisit'])->firstWhere('key', '2:10');
        $this->assertSame('not_assessed', $card['assessment_state']);
        $this->assertSame([], $card['words']);
        $this->assertStringContainsString('review=1', $card['href']);

        $activity = $this->actingAs($user)->getJson('/api/dashboard/activity')->assertOk()->json('activity');
        $revision = collect($activity)->first(fn ($event) => ($event['type'] ?? '') === 'session' && (int) ($event['surah_number'] ?? 0) === 112);
        $beginner = collect($activity)->first(fn ($event) => ($event['type'] ?? '') === 'session' && (int) ($event['surah_number'] ?? 0) === 113);
        $this->assertSame('revision', $revision['practice_kind']);
        $this->assertSame('memorisation', $beginner['practice_kind']);
        $this->assertTrue(collect($activity)->contains(fn ($event) => ($event['practice_kind'] ?? '') === 'memorisation' && ($event['type'] ?? '') === 'ayah_memorised'));
    }

    private function assessment(User $user, int $surah, int $ayah, string $status, ?int $accuracy, string $model): MemorisationAssessment
    {
        return MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => $surah,
            'start_ayah' => $ayah,
            'end_ayah' => $ayah,
            'status' => $status,
            'overall_accuracy' => $accuracy,
            'model_version' => $model,
            'algorithm_version' => 'words-v1',
            'failure_reason' => $status === 'failed' ? 'audio_failed' : null,
        ]);
    }

    private function attempt(User $user, MemorisationAssessment $assessment, int $accuracy, string $band, array $words, $at): void
    {
        $attempt = AiReciteAttempt::query()->create([
            'user_id' => $user->id,
            'memorisation_assessment_id' => $assessment->id,
            'attempt_number' => (int) $assessment->id,
            'accuracy_percent' => $accuracy,
            'band' => $band,
            'ayah_range' => [
                'surah' => $assessment->surah_number,
                'from' => $assessment->start_ayah,
                'to' => $assessment->end_ayah,
            ],
            'word_statuses' => $words,
        ]);
        $attempt->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
    }
}
