<?php

namespace Tests\Unit;

use App\Models\MemorisationAssessmentWord;
use App\Models\MemorisationWeakSpot;
use App\Services\Memorisation\MemorisationHistoryService;
use App\Services\Memorisation\RecitationScoringThresholds;
use Tests\TestCase;

class MemorisationResultClassificationTest extends TestCase
{
    private MemorisationHistoryService $history;

    protected function setUp(): void
    {
        parent::setUp();
        $this->history = new MemorisationHistoryService;
    }

    public function test_result_types_normalise_aliases_and_prefer_out_of_order(): void
    {
        $this->assertSame(
            MemorisationAssessmentWord::TYPE_OUT_OF_ORDER,
            $this->history->normaliseResultType('correct', true)
        );
        $this->assertSame(MemorisationAssessmentWord::TYPE_CORRECT, $this->history->normaliseResultType(' GREEN '));
        $this->assertSame(MemorisationAssessmentWord::TYPE_CLOSE_MATCH, $this->history->normaliseResultType('minor_mistake'));
        $this->assertSame(MemorisationAssessmentWord::TYPE_INCORRECT, $this->history->normaliseResultType('substitution'));
        $this->assertSame(MemorisationAssessmentWord::TYPE_OMITTED, $this->history->normaliseResultType('deletion'));
        $this->assertSame(MemorisationAssessmentWord::TYPE_ADDITIONAL, $this->history->normaliseResultType('insertion'));
        $this->assertSame(MemorisationAssessmentWord::TYPE_UNCERTAIN, $this->history->normaliseResultType(''));
        $this->assertSame(MemorisationAssessmentWord::TYPE_UNCERTAIN, $this->history->normaliseResultType('not-a-status'));
    }

    public function test_match_result_uses_explicit_value_then_accuracy_bands(): void
    {
        $strong = RecitationScoringThresholds::STRONG_ACCURACY_MIN;
        $developing = RecitationScoringThresholds::DEVELOPING_ACCURACY_MIN;

        $this->assertSame('custom', $this->history->resolveMatchResult(10, 'Custom'));
        $this->assertSame('unknown', $this->history->resolveMatchResult(null));
        $this->assertSame('strong', $this->history->resolveMatchResult($strong));
        $this->assertSame('mixed', $this->history->resolveMatchResult($developing));
        $this->assertSame('weak', $this->history->resolveMatchResult(1));
        $this->assertSame('zero_match', $this->history->resolveMatchResult(0));
    }

    public function test_merge_weak_words_dedupes_and_skips_incomplete_rows(): void
    {
        $merged = $this->history->mergeWeakWords(
            [
                ['surahId' => 2, 'ayahNumber' => 5, 'wordIndex' => 1, 'text' => 'session'],
                ['text' => 'missing indexes'],
                'not-an-array',
            ],
            [
                ['surah_number' => 2, 'ayah_number' => 5, 'word_index' => 1, 'text' => 'persistent duplicate'],
                ['surah_number' => 2, 'ayah_number' => 6, 'word_index' => 0, 'text' => 'kept'],
            ],
            16
        );

        $this->assertCount(2, $merged);
        $this->assertSame('session', $merged[0]['text']);
        $this->assertSame('kept', $merged[1]['text']);
    }

    public function test_merge_weak_words_respects_the_limit(): void
    {
        $session = [];
        for ($i = 0; $i < 5; $i++) {
            $session[] = ['surahId' => 1, 'ayahNumber' => 1, 'wordIndex' => $i];
        }

        $this->assertCount(2, $this->history->mergeWeakWords($session, [], 2));
    }

    public function test_uncertain_and_low_confidence_hard_words_are_not_reliable_weaknesses(): void
    {
        $this->assertFalse($this->history->isReliableWordWeakness(['status' => 'uncertain', 'confidence' => 0.99]));
        $this->assertFalse($this->history->isReliableWordWeakness(['status' => 'wrong', 'confidence' => 0.4]));
        $this->assertTrue($this->history->isReliableWordWeakness(['status' => 'missing', 'confidence' => 0.72]));
        $this->assertFalse($this->history->isReliableWordWeakness(['status' => 'minor_mistake', 'severity' => 'amber']));
    }

    public function test_repeated_soft_weakness_becomes_reliable_only_after_a_prior_spot(): void
    {
        $word = ['status' => 'partial', 'severity' => 'amber', 'confidence' => 0.8];
        $existing = new MemorisationWeakSpot(['affected_attempt_count' => 1]);

        $this->assertFalse($this->history->isReliableWordWeakness($word));
        $this->assertTrue($this->history->isReliableWordWeakness($word, $existing));
    }
}
