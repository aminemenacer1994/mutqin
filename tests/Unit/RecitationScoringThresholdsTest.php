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

        $this->assertSame(0.79, $all['correct_similarity']);
        $this->assertSame(0.48, $all['partial_similarity']);
        $this->assertSame(0.55, $all['uncertain_confidence']);
        $this->assertLessThan(
            RecitationScoringThresholds::CORRECT_SIMILARITY,
            RecitationScoringThresholds::SOFT_SIMILARITY_CAP
        );
        $this->assertSame(
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

    public function test_punctuation_is_stripped_for_compare_only(): void
    {
        $service = new QuranAlignmentService;
        $this->assertSame(
            'قل هو الله احد',
            $service->normalizeArabic('قُلْ، هُوَ ٱللَّهُ أَحَدٌ؟')
        );
    }
}
