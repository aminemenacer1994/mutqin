<?php

namespace Tests\Unit;

use App\Services\Memorisation\QuranAlignmentService;
use App\Services\Memorisation\RecitationScoringThresholds;
use PHPUnit\Framework\TestCase;

class RecitationScoringThresholdsTest extends TestCase
{
    public function test_thresholds_are_centralized_and_ordered(): void
    {
        $all = RecitationScoringThresholds::all();

        $this->assertSame(0.88, $all['correct_similarity']);
        $this->assertSame(0.64, $all['partial_similarity']);
        $this->assertSame(0.36, $all['uncertain_confidence']);
        $this->assertSame(90, $all['strong_accuracy_min']);
        $this->assertSame(72, $all['developing_accuracy_min']);
        $this->assertSame(93, $all['progression_with_errors_min']);
        $this->assertSame(0.12, $all['partial_accuracy_weight']);
        $this->assertSame(0.0, $all['uncertain_accuracy_weight']);
        $this->assertLessThan(
            RecitationScoringThresholds::CORRECT_SIMILARITY,
            RecitationScoringThresholds::SOFT_SIMILARITY_CAP
        );
        $this->assertGreaterThanOrEqual(
            RecitationScoringThresholds::PARTIAL_SIMILARITY,
            RecitationScoringThresholds::SOFT_SIMILARITY_CAP
        );
        $this->assertGreaterThan(
            RecitationScoringThresholds::UNCERTAIN_CONFIDENCE,
            RecitationScoringThresholds::MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT
        );
    }

    public function test_low_confidence_similarity_is_uncertain_not_correct(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 1,
                'surah_number' => 112,
                'words' => ['قل', 'هو', 'الله', 'احد'],
            ]],
            [
                ['word' => 'قل', 'confidence' => 0.95],
                ['word' => 'هي', 'confidence' => 0.32],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'احد', 'confidence' => 0.93],
            ]
        );

        $this->assertSame('uncertain', $result['word_results'][1]['status']);
        $this->assertSame(0, $result['color_counts']['red']);
    }

    public function test_soft_letter_variation_is_minor_not_green(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 6,
                'surah_number' => 1,
                'text' => 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
            ]],
            [
                ['word' => 'اهدنا', 'confidence' => 0.93],
                ['word' => 'السراط', 'confidence' => 0.9],
                ['word' => 'المستقيم', 'confidence' => 0.92],
            ]
        );

        $this->assertSame('correct', $result['word_results'][0]['status']);
        $this->assertSame('minor_mistake', $result['word_results'][1]['status']);
        $this->assertSame('correct', $result['word_results'][2]['status']);
        $this->assertSame(1, $result['color_counts']['amber']);
    }

    public function test_mid_confidence_fuzzy_match_is_not_green(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 1,
                'surah_number' => 112,
                'words' => ['قل', 'هو', 'الله', 'احد'],
            ]],
            [
                ['word' => 'قل', 'confidence' => 0.95],
                // High lexical overlap but below the similarity-green confidence floor.
                ['word' => 'هوو', 'confidence' => 0.62],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'احد', 'confidence' => 0.93],
            ]
        );

        $this->assertNotSame('correct', $result['word_results'][1]['status']);
        $this->assertContains(
            $result['word_results'][1]['status'],
            ['minor_mistake', 'wrong']
        );
    }

    public function test_punctuation_is_stripped_for_compare_only(): void
    {
        $service = new QuranAlignmentService;
        $this->assertSame(
            'قل هو الله احد',
            $service->normalizeArabic('قُلْ، هُوَ ٱللَّهُ أَحَدٌ؟')
        );
    }
}
