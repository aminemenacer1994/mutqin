<?php

namespace Tests\Unit;

use App\Models\MemorisationAssessment;
use App\Models\MemorisationAssessmentWord;
use App\Models\MemorisationWeakSpot;
use App\Models\User;
use App\Services\Memorisation\MemorisationHistoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MarkRecalledWordsBatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_mark_recalled_words_updates_in_one_query(): void
    {
        $user = User::factory()->create();
        $assessment = MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 2,
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 90,
            'match_result' => 'strong',
        ]);

        $keys = [];
        for ($i = 0; $i < 5; $i++) {
            $key = MemorisationWeakSpot::buildSpotKey(MemorisationWeakSpot::TYPE_WORD, 1, 1, $i);
            $keys[] = $key;
            MemorisationWeakSpot::query()->create([
                'user_id' => $user->id,
                'spot_type' => MemorisationWeakSpot::TYPE_WORD,
                'surah_number' => 1,
                'ayah_number' => 1,
                'word_index' => $i,
                'verse_key' => '1:1',
                'spot_key' => $key,
                'severity' => 'medium',
                'status' => MemorisationWeakSpot::STATUS_ACTIVE,
                'trend' => 'stable',
                'affected_attempt_count' => 1,
                'first_identified_at' => now()->subDay(),
                'last_identified_at' => now()->subDay(),
            ]);
        }

        $wordResults = [];
        for ($i = 0; $i < 5; $i++) {
            $wordResults[] = [
                'status' => MemorisationAssessmentWord::TYPE_CORRECT,
                'surah_number' => 1,
                'ayah_number' => 1,
                'word_index' => $i,
            ];
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        app(MemorisationHistoryService::class)->markRecalledWords($user, $assessment, $wordResults);

        $queries = collect(DB::getQueryLog())
            ->filter(fn (array $q) => str_contains(strtolower($q['query']), 'memorisation_weak_spots'));
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(2, $queries->count(), 'Expected a single bulk UPDATE (plus optional connection noise).');
        $this->assertSame(
            5,
            MemorisationWeakSpot::query()
                ->where('user_id', $user->id)
                ->where('status', MemorisationWeakSpot::STATUS_IMPROVING)
                ->count()
        );
    }
}
