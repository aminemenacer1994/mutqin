<?php

namespace Tests\Unit;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use App\Services\Memorisation\MemorisationHistoryService;
use App\Services\Memorisation\RecitationMasteryService;
use App\Services\Memorisation\WeaknessAnalysisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecitationMasteryServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_mastery_moves_slowly_on_single_strong_session(): void
    {
        $user = User::factory()->create();
        $service = app(RecitationMasteryService::class);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => 'completed',
            'completion_state' => 'completed',
            'overall_accuracy' => 92,
            'match_result' => 'strong',
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => ['weak_ayahs' => [], 'ayah_results' => []],
        ]);

        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'learning',
            'mastery_level' => 20,
            'repetitions' => 1,
        ]);

        $service->applyFromAssessment($user, $assessment, [
            'weak_ayahs' => [],
            'ayah_results' => [['ayah_number' => 1, 'accuracy' => 92]],
        ], ['accuracy' => 92], 'strong');

        $row = MemorisationProgress::query()->where('user_id', $user->id)->where('ayah_number', 1)->first();
        $this->assertNotNull($row);
        $this->assertGreaterThan(20, (int) $row->mastery_level);
        $this->assertLessThan(60, (int) $row->mastery_level);
    }

    public function test_failed_assessments_do_not_change_mastery(): void
    {
        $user = User::factory()->create();
        $service = app(RecitationMasteryService::class);

        MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'learning',
            'mastery_level' => 40,
            'repetitions' => 1,
        ]);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_FAILED,
            'completion_state' => 'failed',
            'overall_accuracy' => null,
            'match_result' => 'failed',
            'failure_reason' => 'no_speech',
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => [],
        ]);

        $service->applyFromAssessment($user, $assessment, [
            'weak_ayahs' => [1],
            'ayah_results' => [['ayah_number' => 1, 'accuracy' => 0]],
        ], ['accuracy' => 0], 'weak');

        $row = MemorisationProgress::query()->where('user_id', $user->id)->where('ayah_number', 1)->first();
        $this->assertSame(40, (int) $row->mastery_level);
    }

    public function test_uncertain_words_are_not_persisted_as_weak_spots(): void
    {
        $user = User::factory()->create();
        $history = app(MemorisationHistoryService::class);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => 'completed',
            'completion_state' => 'completed',
            'overall_accuracy' => 70,
            'match_result' => 'mixed',
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => [],
        ]);

        $history->upsertWeakSpots($user, $assessment, [
            'weak_words' => [[
                'surahId' => 1,
                'ayahNumber' => 1,
                'wordIndex' => 2,
                'status' => 'uncertain',
                'confidence' => 0.2,
            ]],
            'weak_ayahs' => [],
        ]);

        $this->assertSame(0, MemorisationWeakSpot::query()->where('user_id', $user->id)->count());
    }

    public function test_repeated_hard_mistakes_become_reliable_weak_spots(): void
    {
        $user = User::factory()->create();
        $history = app(MemorisationHistoryService::class);

        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => 'completed',
            'completion_state' => 'completed',
            'overall_accuracy' => 55,
            'match_result' => 'mixed',
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => [],
        ]);

        $word = [
            'surahId' => 1,
            'ayahNumber' => 1,
            'wordIndex' => 4,
            'status' => 'wrong',
            'confidence' => 0.5,
            'severity' => 'red',
        ];

        $history->upsertWeakSpots($user, $assessment, ['weak_words' => [$word], 'weak_ayahs' => []]);
        $this->assertSame(0, MemorisationWeakSpot::query()->where('user_id', $user->id)->count());

        $second = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'assessment_type' => 'memorisation_detection',
            'status' => 'completed',
            'completion_state' => 'completed',
            'overall_accuracy' => 50,
            'match_result' => 'weak',
            'word_results' => [],
            'ayah_results' => [],
            'error_classifications' => [],
            'weakness_analysis' => [],
        ]);

        MemorisationWeakSpot::query()->create([
            'user_id' => $user->id,
            'spot_type' => MemorisationWeakSpot::TYPE_WORD,
            'surah_number' => 1,
            'ayah_number' => 1,
            'word_index' => 4,
            'verse_key' => '1:1',
            'spot_key' => MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_WORD, 1, 1, 4),
            'severity' => 'moderate',
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => 'stable',
            'affected_attempt_count' => 1,
            'first_identified_at' => now(),
            'last_identified_at' => now(),
            'source_assessment_id' => $assessment->id,
            'last_assessment_id' => $assessment->id,
        ]);

        $history->upsertWeakSpots($user, $second, ['weak_words' => [$word], 'weak_ayahs' => []]);

        $spot = MemorisationWeakSpot::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($spot);
        $this->assertGreaterThanOrEqual(2, (int) $spot->affected_attempt_count);
    }

    public function test_weakness_analysis_excludes_uncertain_from_weak_words(): void
    {
        $weakness = new WeaknessAnalysisService;
        $analysis = $weakness->analyse([
            [
                'status' => 'uncertain',
                'ayah_number' => 1,
                'ayah_key' => '1:1',
                'ayah_word_index' => 0,
                'text' => 'word',
                'confidence' => 0.2,
            ],
            [
                'status' => 'wrong',
                'ayah_number' => 1,
                'ayah_key' => '1:1',
                'ayah_word_index' => 1,
                'text' => 'other',
                'confidence' => 0.9,
            ],
        ], [], ['green' => 0, 'red' => 1, 'uncertain' => 1], 50);

        $this->assertCount(1, $analysis['weak_words']);
        $this->assertSame(1, $analysis['error_types']['uncertain']);
    }
}
