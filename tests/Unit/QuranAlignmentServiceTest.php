<?php

namespace Tests\Unit;

use App\Services\Memorisation\QuranAlignmentService;
use App\Services\Memorisation\PracticePlanRecommendationService;
use App\Services\Memorisation\WeaknessAnalysisService;
use PHPUnit\Framework\TestCase;

class QuranAlignmentServiceTest extends TestCase
{
    public function test_normalize_strips_diacritics_and_unifies_alef(): void
    {
        $service = new QuranAlignmentService;
        $this->assertSame('الله', $service->normalizeArabic('اللَّهَ'));
        $this->assertSame('الرحمن', $service->normalizeArabic('الرَّحْمَٰنِ'));
    }

    public function test_perfect_recitation_marks_words_correct(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'text' => 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
            ]],
            [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
                ['word' => 'الرحمن', 'confidence' => 0.93],
                ['word' => 'الرحيم', 'confidence' => 0.96],
            ]
        );

        $this->assertGreaterThanOrEqual(90, $result['accuracy']);
        $this->assertSame('correct', $result['word_results'][0]['status']);
        $this->assertSame(4, $result['color_counts']['green']);
    }

    public function test_missing_word_is_detected(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله', 'الرحمن', 'الرحيم'],
            ]],
            [
                ['word' => 'بسم', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'الرحيم', 'confidence' => 0.9],
            ]
        );

        $statuses = array_column($result['word_results'], 'status');
        $this->assertContains('missing', $statuses);
    }

    public function test_wrong_word_is_detected(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 1,
                'surah_number' => 112,
                'words' => ['قل', 'هو', 'الله', 'احد'],
            ]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'هو', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'صمد', 'confidence' => 0.9],
            ]
        );

        $this->assertSame('wrong', $result['word_results'][3]['status']);
        $this->assertSame(1, $result['color_counts']['red']);
    }

    public function test_omission_insertion_and_repetition(): void
    {
        $service = new QuranAlignmentService;

        $omission = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );
        $this->assertContains('missing', array_column($omission['word_results'], 'status'));

        $insertion = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'هو', 'confidence' => 0.9],
                ['word' => 'يا', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );
        $this->assertNotEmpty($insertion['extra_words']);
        $this->assertSame('يا', $insertion['extra_words'][0]['word']);

        $repetition = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'هو', 'confidence' => 0.9],
                ['word' => 'هو', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );
        $this->assertNotEmpty($repetition['extra_words']);
        $this->assertSame('repetition', $repetition['extra_words'][0]['type'] ?? '');
    }

    public function test_soft_letter_swap_is_not_marked_correct(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'كل', 'confidence' => 0.9],
                ['word' => 'هو', 'confidence' => 0.9],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );

        $this->assertNotSame('correct', $result['word_results'][0]['status']);
        $this->assertContains($result['word_results'][0]['status'], ['minor_mistake', 'wrong']);
    }

    public function test_hard_single_letter_edit_is_wrong_not_green(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [['ayah_number' => 7, 'surah_number' => 1, 'words' => ['غير', 'المغضوب', 'عليهم', 'ولا', 'الضالين']]],
            [
                ['word' => 'غير', 'confidence' => 0.95],
                ['word' => 'المغضوب', 'confidence' => 0.95],
                ['word' => 'عليهم', 'confidence' => 0.95],
                ['word' => 'ولا', 'confidence' => 0.95],
                ['word' => 'الدالين', 'confidence' => 0.95],
            ]
        );

        $last = $result['word_results'][4];
        $this->assertSame('wrong', $last['status']);
        $this->assertSame('الدالين', $last['actual']);
    }

    public function test_low_confidence_is_uncertain_not_wrong(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'هي', 'confidence' => 0.4],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );

        $this->assertSame('uncertain', $result['word_results'][1]['status']);
        $this->assertSame(0, $result['color_counts']['red']);
    }

    public function test_very_low_confidence_token_is_not_dropped_as_missing(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'هو', 'confidence' => 0.25],
                ['word' => 'الله', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );

        $statuses = array_column($result['word_results'], 'status');
        $this->assertSame('correct', $statuses[0]);
        $this->assertNotSame('missing', $statuses[1], 'low-confidence STT must not become a learner omission');
        $this->assertContains($statuses[1], ['correct', 'uncertain']);
        $this->assertSame('correct', $statuses[2]);
        $this->assertSame('correct', $statuses[3]);
    }

    public function test_skipped_phrase_marks_omissions(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [['ayah_number' => 1, 'surah_number' => 112, 'words' => ['قل', 'هو', 'الله', 'احد']]],
            [
                ['word' => 'قل', 'confidence' => 0.9],
                ['word' => 'احد', 'confidence' => 0.9],
            ]
        );

        $statuses = array_column($result['word_results'], 'status');
        $this->assertSame('correct', $statuses[0]);
        $this->assertSame('missing', $statuses[1]);
        $this->assertSame('missing', $statuses[2]);
        $this->assertSame('correct', $statuses[3]);
    }

    public function test_weakness_and_plan_select_anchor_for_few_weak_words(): void
    {
        $alignment = new QuranAlignmentService;
        $weakness = new WeaknessAnalysisService;
        $plans = new PracticePlanRecommendationService;

        $aligned = $alignment->align(
            [[
                'ayah_number' => 134,
                'surah_number' => 2,
                'words' => ['قال', 'اهم', 'اسلمت', 'لرب', 'العالمين'],
            ]],
            [
                ['word' => 'قال', 'confidence' => 0.9],
                ['word' => 'اهم', 'confidence' => 0.9],
                ['word' => 'كتب', 'confidence' => 0.9],
                ['word' => 'لرب', 'confidence' => 0.9],
                ['word' => 'العالمين', 'confidence' => 0.9],
            ]
        );
        $analysis = $weakness->analyse(
            $aligned['word_results'],
            $aligned['extra_words'],
            $aligned['color_counts'],
            $aligned['accuracy']
        );
        $plan = $plans->recommend($analysis, [
            'surah_number' => 2,
            'surah_name' => 'Al-Baqarah',
            'start_ayah' => 134,
            'end_ayah' => 134,
        ], $aligned['accuracy']);

        $this->assertNotEmpty($plan['techniques']);
        $this->assertArrayHasKey('title', $plan);
        $this->assertArrayHasKey('explanation', $plan);
        $this->assertGreaterThanOrEqual(1, (int) ($plan['repetitions']['target'] ?? 0));
    }
}
