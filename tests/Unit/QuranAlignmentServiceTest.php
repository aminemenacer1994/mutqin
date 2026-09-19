<?php

namespace Tests\Unit;

use App\Services\Memorisation\PracticePlanRecommendationService;
use App\Services\Memorisation\QuranAlignmentService;
use App\Services\Memorisation\QuranTextNormalizer;
use App\Services\Memorisation\WeaknessAnalysisService;
use PHPUnit\Framework\TestCase;

class QuranAlignmentServiceTest extends TestCase
{
    public function test_normalize_strips_diacritics_and_unifies_alef(): void
    {
        $service = new QuranAlignmentService;
        $this->assertSame('الله', $service->normalizeArabic('اللَّهَ'));
        $this->assertSame('الحمد', $service->normalizeArabic('ٱلْحَمْدُ'));
        $this->assertSame('رب', $service->normalizeArabic('رَبِّ'));
        // Dagger alef expands to ا (الرَّحْمَٰنِ → الرحمان), not deleted.
        $this->assertSame('الرحمان', $service->normalizeArabic('الرَّحْمَٰنِ'));
        $this->assertSame('العالمين', $service->normalizeArabic('ٱلْعَٰلَمِينَ'));
        $this->assertSame('الصراط', $service->normalizeArabic('ٱلصِّرَٰطَ'));
    }

    public function test_mushaf_dagger_alef_words_match_plain_asr(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [
                [
                    'ayah_number' => 2,
                    'surah_number' => 1,
                    'text' => 'الْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
                ],
                [
                    'ayah_number' => 4,
                    'surah_number' => 1,
                    'text' => 'مَلِكِ يَوْمِ ٱلدِّينِ',
                ],
                [
                    'ayah_number' => 6,
                    'surah_number' => 1,
                    'text' => 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
                ],
            ],
            [
                ['word' => 'الحمد', 'confidence' => 0.95],
                ['word' => 'لله', 'confidence' => 0.95],
                ['word' => 'رب', 'confidence' => 0.95],
                ['word' => 'العالمين', 'confidence' => 0.95],
                ['word' => 'ملك', 'confidence' => 0.95],
                ['word' => 'يوم', 'confidence' => 0.95],
                ['word' => 'الدين', 'confidence' => 0.95],
                ['word' => 'اهدنا', 'confidence' => 0.95],
                ['word' => 'الصراط', 'confidence' => 0.95],
                ['word' => 'المستقيم', 'confidence' => 0.95],
            ]
        );

        $this->assertSame(100, $result['accuracy']);
        $this->assertSame(10, $result['color_counts']['green']);
        foreach ($result['word_results'] as $word) {
            $this->assertSame('correct', $word['status'], json_encode($word, JSON_UNESCAPED_UNICODE));
        }
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
        $this->assertSame('صمد', $result['word_results'][3]['raw_word']);
        $this->assertSame('', $result['word_results'][3]['display_word']);
        $this->assertSame('احد', $result['word_results'][3]['text']);
    }

    public function test_substitution_detection_uses_anchors_without_cascading_and_preserves_analysis(): void
    {
        $service = new QuranAlignmentService;
        $recognition = [
            ['word' => 'الحمد', 'confidence' => 0.95, 'start' => 0.0, 'end' => 0.2, 'token' => 'sm-0'],
            ['word' => 'لله', 'confidence' => 0.95, 'start' => 0.3, 'end' => 0.5, 'token' => 'sm-1'],
            ['word' => 'الرحمن', 'confidence' => 0.95, 'start' => 0.6, 'end' => 0.8, 'token' => 'sm-2'],
            ['word' => 'العالمين', 'confidence' => 0.95, 'start' => 0.9, 'end' => 1.1, 'token' => 'sm-3'],
            ['word' => 'الرحمن', 'confidence' => 0.95, 'start' => 1.2, 'end' => 1.4, 'token' => 'sm-4'],
        ];
        $result = $service->align(
            [['words' => ['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن']]],
            $recognition
        );

        $this->assertSame(['MATCH', 'MATCH', 'SUBSTITUTION', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame(['correct', 'correct', 'wrong', 'correct', 'correct'], array_column($result['word_results'], 'status'));
        $this->assertSame(1, $result['color_counts']['red']);
        $this->assertSame('الرحمن', $result['word_results'][2]['actual']);
        $this->assertSame('sm-2', $result['word_results'][2]['token']);
        $this->assertSame(0.6, $result['word_results'][2]['start']);
        $this->assertSame(0.8, $result['word_results'][2]['end']);

        $analysis = (new WeaknessAnalysisService)->analyse(
            $result['word_results'],
            $result['extra_words'],
            $result['color_counts'],
            $result['accuracy']
        );
        $this->assertSame('رب', $analysis['substitutions'][0]['expected']);
        $this->assertSame('الرحمن', $analysis['substitutions'][0]['actual']);
    }

    public function test_low_confidence_correct_word_is_not_a_substitution_and_high_confidence_wrong_word_is(): void
    {
        $service = new QuranAlignmentService;
        $lowConfidence = $service->align(
            [['words' => ['الحمد', 'لله', 'رب', 'العالمين']]],
            [
                ['word' => 'الحمد', 'confidence' => 0.4],
                ['word' => 'لله', 'confidence' => 0.4],
                ['word' => 'رب', 'confidence' => 0.4],
                ['word' => 'العالمين', 'confidence' => 0.4],
            ]
        );
        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($lowConfidence['word_results'], 'type'));
        $this->assertSame(0, $lowConfidence['color_counts']['red']);

        $highConfidenceWrong = $service->align(
            [['words' => ['الحمد', 'لله', 'رب', 'العالمين']]],
            [
                ['word' => 'الحمد', 'confidence' => 0.99],
                ['word' => 'لله', 'confidence' => 0.99],
                ['word' => 'رب', 'confidence' => 0.99],
                ['word' => 'الرحمن', 'confidence' => 0.99],
            ]
        );
        $this->assertSame('SUBSTITUTION', $highConfidenceWrong['word_results'][3]['type']);
        $this->assertSame('wrong', $highConfidenceWrong['word_results'][3]['status']);
        $this->assertSame('الرحمن', $highConfidenceWrong['word_results'][3]['actual']);
    }

    public function test_correct_match_exposes_canonical_display_word_and_preserves_asr_metadata(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [[
                'ayah_number' => 2,
                'surah_number' => 1,
                'text' => 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
            ]],
            [
                ['word' => 'الحمد', 'confidence' => 0.96, 'start' => 1.24, 'end' => 1.67],
                ['word' => 'لله', 'confidence' => 0.95, 'start' => 1.70, 'end' => 1.92],
                ['word' => 'رب', 'confidence' => 0.94, 'start' => 1.95, 'end' => 2.10],
                ['word' => 'العالمين', 'confidence' => 0.97, 'start' => 2.14, 'end' => 2.80],
            ]
        );

        $this->assertSame('correct', $result['word_results'][0]['status']);
        $this->assertSame('ٱلْحَمْدُ', $result['word_results'][0]['display_word']);
        $this->assertSame('الحمد', $result['word_results'][0]['raw_word']);
        $this->assertSame(0.96, $result['word_results'][0]['confidence']);
        $this->assertSame(1.24, $result['word_results'][0]['start']);
        $this->assertSame(1.67, $result['word_results'][0]['end']);
        $this->assertSame('ٱلْعَٰلَمِينَ', $result['word_results'][3]['display_word']);
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
        $this->assertSame(['MATCH', 'DELETION', 'MATCH'], array_column(
            array_slice($omission['word_results'], 0, 3),
            'type'
        ));
        $this->assertSame('red', $omission['word_results'][1]['visual_status']);
        $this->assertSame('red', $omission['word_results'][1]['highlight']);
        $this->assertSame(1, $omission['color_counts']['red']);
        $this->assertSame(0, $omission['color_counts']['black']);

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
        $this->assertSame('repetition', $repetition['extra_words'][0]['legacy_type'] ?? '');
    }

    public function test_insertions_realign_without_cascading_and_keep_speechmatics_debug_fields(): void
    {
        $service = new QuranAlignmentService;
        $result = $service->align(
            [['words' => ['الحمد', 'لله', 'رب', 'العالمين']]],
            [
                ['word' => 'الحمد', 'confidence' => 0.95, 'token' => 'sm-0', 'start' => 0.0, 'end' => 0.2],
                ['word' => 'لله', 'confidence' => 0.95, 'token' => 'sm-1', 'start' => 0.3, 'end' => 0.5],
                ['word' => 'العظيم', 'confidence' => 0.95, 'token' => 'sm-2', 'start' => 0.6, 'end' => 0.8],
                ['word' => 'رب', 'confidence' => 0.95, 'token' => 'sm-3', 'start' => 0.9, 'end' => 1.1],
                ['word' => 'العالمين', 'confidence' => 0.95, 'token' => 'sm-4', 'start' => 1.2, 'end' => 1.4],
            ]
        );

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame(['INSERTION'], array_column($result['extra_words'], 'type'));
        $this->assertSame('العظيم', $result['extra_words'][0]['recognised_word']);
        $this->assertSame('sm-2', $result['extra_words'][0]['token']);
        $this->assertSame(0.6, $result['extra_words'][0]['start']);
        $this->assertSame(0.95, $result['extra_words'][0]['speechmatics_confidence']);
        $this->assertSame('العظيم', $result['word_results'][1]['attached_error_markers'][0]['word']);
    }

    public function test_multiple_insertions_and_low_confidence_do_not_become_insertions(): void
    {
        $service = new QuranAlignmentService;
        $multiple = $service->align(
            [['words' => ['الحمد', 'لله', 'رب', 'العالمين']]],
            [
                ['word' => 'الحمد', 'confidence' => 0.95],
                ['word' => 'لله', 'confidence' => 0.95],
                ['word' => 'العظيم', 'confidence' => 0.95],
                ['word' => 'الرحمن', 'confidence' => 0.95],
                ['word' => 'رب', 'confidence' => 0.95],
                ['word' => 'العالمين', 'confidence' => 0.95],
            ]
        );
        $this->assertSame(['INSERTION', 'INSERTION'], array_column($multiple['extra_words'], 'type'));
        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($multiple['word_results'], 'type'));

        $lowConfidence = $service->align(
            [['words' => ['الحمد', 'لله', 'رب', 'العالمين']]],
            [
                ['word' => 'الحمد', 'confidence' => 0.95],
                ['word' => 'لله', 'confidence' => 0.95],
                ['word' => 'العظيم', 'confidence' => 0.4, 'token' => 'low-2'],
                ['word' => 'رب', 'confidence' => 0.95],
                ['word' => 'العالمين', 'confidence' => 0.95],
            ]
        );
        $this->assertNotContains('INSERTION', array_column($lowConfidence['extra_words'], 'type'));
        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($lowConfidence['word_results'], 'type'));
        $this->assertSame('low-2', $lowConfidence['extra_words'][0]['token']);
        $this->assertSame(100, $lowConfidence['accuracy']);
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
        $this->assertSame('minor_mistake', $last['status']);
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

    public function test_required_ai_recite_edge_case_fixtures(): void
    {
        $cases = [
            'perfect recitation' => [
                'heard' => ['الحمد', 'لله', 'رب', 'العالمين'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
            ],
            'substitution without cascade' => [
                'heard' => ['الحمد', 'لله', 'رب', 'الرحمن'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION'],
            ],
            'skipped word + realignment' => [
                'heard' => ['الحمد', 'لله', 'العالمين'],
                'types' => ['MATCH', 'MATCH', 'DELETION', 'MATCH'],
            ],
            'extra word + realignment' => [
                'heard' => ['الحمد', 'لله', 'العظيم', 'رب', 'العالمين'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
                'extra_types' => ['INSERTION'],
            ],
            'repetition' => [
                'heard' => ['الحمد', 'لله', 'لله', 'رب', 'العالمين'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
                'extra_types' => ['REPETITION'],
            ],
            'self-correction' => [
                'heard' => [
                    ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
                    ['word' => 'لله', 'start' => 0.25, 'end' => 0.45],
                    ['word' => 'الرحمن', 'start' => 0.5, 'end' => 0.8],
                    ['word' => 'رب', 'start' => 1.55, 'end' => 1.7],
                    ['word' => 'العالمين', 'start' => 1.75, 'end' => 2.1],
                ],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
                'extra_types' => ['SELF_CORRECTION'],
            ],
            'hesitation' => [
                'heard' => [
                    ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
                    ['word' => 'لله', 'start' => 0.25, 'end' => 0.45],
                    ['word' => 'رب', 'start' => 2.2, 'end' => 2.35],
                    ['word' => 'العالمين', 'start' => 2.4, 'end' => 2.8],
                ],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
                'events' => ['HESITATION'],
            ],
            'restart/backtracking' => [
                'heard' => ['الحمد', 'لله', 'الحمد', 'لله', 'رب', 'العالمين'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
                'extra_types' => ['RESTART', 'RESTART'],
            ],
            'mid-ayah start' => [
                'heard' => ['رب', 'العالمين'],
                'types' => ['DELETION', 'DELETION', 'MATCH', 'MATCH'],
            ],
            'early stop' => [
                'heard' => ['الحمد', 'لله', 'رب'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'DELETION'],
            ],
            'out-of-range continuation' => [
                'heard' => ['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
                'extra_types' => ['OUT_OF_RANGE', 'OUT_OF_RANGE'],
            ],
            'wrong-ayah drift + realignment' => [
                'expected' => ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
                'heard' => ['ا', 'ب', 'س', 'ش', 'ص', 'ح', 'خ'],
                'types' => ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            ],
            'fast recitation' => [
                'heard' => [
                    ['word' => 'الحمد', 'start' => 0.00, 'end' => 0.08],
                    ['word' => 'لله', 'start' => 0.09, 'end' => 0.16],
                    ['word' => 'رب', 'start' => 0.17, 'end' => 0.22],
                    ['word' => 'العالمين', 'start' => 0.23, 'end' => 0.34],
                ],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
            ],
            'voice/accent variation' => [
                'heard' => ['الحمد', 'لله', 'رب', 'العالمين'],
                'types' => ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
            ],
        ];

        foreach ($cases as $name => $case) {
            $expected = $case['expected'] ?? ['الحمد', 'لله', 'رب', 'العالمين'];
            $result = $this->alignWords($expected, $case['heard']);
            $this->assertSame($case['types'], array_column($result['word_results'], 'type'), $name);
            if (isset($case['extra_types'])) {
                $this->assertSame($case['extra_types'], array_column($result['extra_words'], 'type'), $name);
            }
            if (isset($case['events'])) {
                $this->assertSame($case['events'], array_values(array_unique(array_column($result['events'], 'type'))), $name);
            }
        }
    }

    public function test_short_wrong_phrase_drift_preserves_indexes_and_realigns(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            [
                ['word' => 'ا', 'start' => 0.0, 'end' => 0.2],
                ['word' => 'ب', 'start' => 0.3, 'end' => 0.5],
                ['word' => 'س', 'start' => 0.6, 'end' => 0.8],
                ['word' => 'ش', 'start' => 0.9, 'end' => 1.1],
                ['word' => 'ج', 'start' => 1.2, 'end' => 1.4],
                ['word' => 'ح', 'start' => 1.5, 'end' => 1.7],
                ['word' => 'خ', 'start' => 1.8, 'end' => 2.0],
            ]
        );

        $this->assertSame(
            ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
        $this->assertSame(['س', 'ش'], array_column(array_slice($result['word_results'], 2, 2), 'actual'));
        $this->assertSame([2, 3], array_column(array_slice($result['word_results'], 2, 2), 'expected_index'));
        $this->assertSame([2, 3], array_column(array_slice($result['word_results'], 2, 2), 'recognised_index'));
        $this->assertSame(0.6, $result['word_results'][2]['start_time']);
        $this->assertSame('green', $result['word_results'][4]['visual_status']);
    }

    public function test_long_drift_uses_the_later_anchor_without_cascade(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            ['ا', 'ب', 'س', 'ش', 'ص', 'ح', 'خ']
        );

        $this->assertSame(
            ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
        $this->assertSame(['ح', 'خ'], array_column(array_slice($result['word_results'], 5), 'actual'));
        $this->assertSame(4, $result['color_counts']['green']);
    }

    public function test_drift_without_return_is_unresolved_but_does_not_paint_the_tail_red(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            ['ا', 'ب', 'س', 'ش', 'ص']
        );

        $types = array_column($result['word_results'], 'type');
        $this->assertContains('DIVERGENCE', $types);
        $this->assertNotContains('REALIGNMENT', $types);
        $this->assertSame(['DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE'], array_slice($types, 2, 3));
        $this->assertSame([2, 3, 4], array_column(array_slice($result['word_results'], 2, 3), 'recognised_index'));
        $this->assertSame('DELETION', $types[6]);
        $this->assertNotSame('wrong', $result['word_results'][6]['status']);
    }

    public function test_single_false_anchor_does_not_trigger_realignment_or_cascade(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د'],
            ['ا', 'ب', 'س', 'ج', 'ص', 'ح', 'خ', 'د']
        );

        $this->assertNotContains('REALIGNMENT', array_column($result['word_results'], 'type'));
        $this->assertSame(
            ['MATCH', 'MATCH', 'DELETION', 'SUBSTITUTION', 'MATCH', 'MATCH', 'MATCH', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
    }

    public function test_drift_with_hesitation_keeps_the_return_anchor_green(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            [
                ['word' => 'ا', 'start' => 0.0, 'end' => 0.2],
                ['word' => 'ب', 'start' => 0.3, 'end' => 0.5],
                ['word' => 'س', 'start' => 0.6, 'end' => 0.8],
                ['word' => 'ش', 'start' => 0.9, 'end' => 1.1],
                ['word' => 'ص', 'start' => 1.2, 'end' => 1.4],
                ['word' => 'ح', 'start' => 3.0, 'end' => 3.2],
                ['word' => 'خ', 'start' => 3.3, 'end' => 3.5],
            ]
        );

        $this->assertContains('HESITATION', array_column($result['events'], 'type'));
        $this->assertSame('REALIGNMENT', $result['word_results'][5]['type']);
        $this->assertSame('green', $result['word_results'][5]['visual_status']);
    }

    public function test_drift_followed_by_self_correction_does_not_cascade(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            [
                ['word' => 'ا', 'start' => 0.0, 'end' => 0.2],
                ['word' => 'ب', 'start' => 0.3, 'end' => 0.5],
                ['word' => 'س', 'start' => 0.6, 'end' => 0.8],
                ['word' => 'ش', 'start' => 0.9, 'end' => 1.1],
                ['word' => 'ت', 'start' => 2.0, 'end' => 2.2],
                ['word' => 'ث', 'start' => 2.3, 'end' => 2.5],
                ['word' => 'ج', 'start' => 2.6, 'end' => 2.8],
                ['word' => 'ح', 'start' => 2.9, 'end' => 3.1],
                ['word' => 'خ', 'start' => 3.2, 'end' => 3.4],
            ]
        );

        $this->assertContains('SELF_CORRECTION', array_column($result['extra_words'], 'type'));
        $this->assertNotContains('DELETION', array_column($result['word_results'], 'type'));
        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
    }

    public function test_successful_later_realignment_keeps_every_later_word_green(): void
    {
        $result = $this->alignWords(
            ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            ['ا', 'ب', 'س', 'ش', 'ص', 'ح', 'خ']
        );

        $this->assertSame(
            ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
        $this->assertSame(['correct', 'correct'], array_column(array_slice($result['word_results'], 5), 'status'));
        $this->assertSame(4, $result['color_counts']['green']);
    }

    public function test_live_alignment_does_not_mark_future_words_deleted(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], ['الحمد', 'لله', 'رب'], [
            'lifecycle' => 'live',
        ]);

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'UNASSESSED'], array_column($result['word_results'], 'type'));
        $this->assertSame('uncertain', $result['word_results'][3]['status']);
    }

    public function test_mid_ayah_start_at_second_word_uses_later_anchor(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], ['لله', 'رب', 'العالمين']);

        $this->assertSame(['DELETION', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame([null, 0, 1, 2], array_column($result['word_results'], 'recognised_index'));
    }

    public function test_mid_ayah_start_near_middle_preserves_the_remaining_phrase(): void
    {
        $result = $this->alignWords(
            ['واحد', 'اثنان', 'ثلاثة', 'اربعة', 'خمسة', 'ستة'],
            ['ثلاثة', 'اربعة', 'خمسة', 'ستة']
        );

        $this->assertSame(
            ['DELETION', 'DELETION', 'MATCH', 'MATCH', 'MATCH', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
    }

    public function test_ambiguous_single_low_confidence_word_does_not_select_a_mid_ayah_anchor(): void
    {
        $result = $this->alignWords(
            ['الحمد', 'رب', 'لله', 'رب', 'العالمين'],
            [['word' => 'رب', 'confidence' => 0.4]]
        );

        $this->assertSame('UNASSESSED', $result['word_results'][0]['type']);
        $this->assertNotContains('MATCH', array_column($result['word_results'], 'type'));
        $this->assertNull($result['metadata']['starting_anchor']);
    }

    public function test_strong_multi_word_anchor_selects_the_best_mid_ayah_start(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], ['رب', 'العالمين']);

        $this->assertSame(['DELETION', 'DELETION', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame(['expected_index' => 2, 'recognised_index' => 0, 'length' => 2], $result['metadata']['starting_anchor']);
    }

    public function test_mid_ayah_start_then_restart_from_beginning_keeps_restart_amber(): void
    {
        $result = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العالمين'],
            ['رب', 'العالمين', 'الحمد', 'لله', 'رب', 'العالمين']
        );

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame(['RESTART', 'RESTART'], array_column($result['extra_words'], 'type'));
    }

    public function test_mid_ayah_opening_words_are_pending_live_and_deletions_after_finalisation(): void
    {
        $heard = ['رب', 'العالمين'];
        $live = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], $heard, ['lifecycle' => 'live']);
        $final = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], $heard);

        $this->assertSame(['UNASSESSED', 'UNASSESSED', 'MATCH', 'MATCH'], array_column($live['word_results'], 'type'));
        $this->assertSame(['DELETION', 'DELETION', 'MATCH', 'MATCH'], array_column($final['word_results'], 'type'));
    }

    public function test_restart_from_ayah_beginning_keeps_original_and_marks_repeat_amber(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'الحمد', 'start' => 0.6, 'end' => 0.8],
            ['word' => 'لله', 'start' => 0.9, 'end' => 1.1],
            ['word' => 'رب', 'start' => 1.2, 'end' => 1.4],
            ['word' => 'العالمين', 'start' => 1.5, 'end' => 1.8],
        ]);

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame(['RESTART', 'RESTART'], array_column($result['extra_words'], 'type'));
        $this->assertSame(['amber', 'amber'], array_column($result['extra_words'], 'highlight'));
        $this->assertSame([2, 3], array_column($result['extra_words'], 'recognised_index'));
        $this->assertSame([[0, 1], [0, 1]], array_map(
            static fn (array $word): array => [$word['restart_start_index'], $word['restart_end_index']],
            $result['extra_words']
        ));
        $restartEvents = array_values(array_filter($result['events'], static fn (array $event): bool => ($event['type'] ?? '') === 'RESTART'));
        $this->assertCount(1, $restartEvents);
        $this->assertSame('amber', $restartEvents[0]['highlight']);
        $this->assertSame(0.6, $restartEvents[0]['start_time']);
        $this->assertSame(1.1, $restartEvents[0]['end_time']);
        $this->assertSame(1, $result['scenario_counts']['restarts']);
    }

    public function test_restart_from_middle_requires_a_two_word_contextual_anchor(): void
    {
        $result = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم'],
            ['الحمد', 'لله', 'رب', 'العالمين', 'رب', 'العالمين', 'الرحمن', 'الرحيم']
        );

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertSame(['RESTART', 'RESTART'], array_column($result['extra_words'], 'type'));
        $this->assertSame([[2, 3], [2, 3]], array_map(
            static fn (array $word): array => [$word['restart_start_index'], $word['restart_end_index']],
            $result['extra_words']
        ));
    }

    public function test_hesitation_before_restart_is_preserved_without_cascading_errors(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'الحمد', 'start' => 2.0, 'end' => 2.2],
            ['word' => 'لله', 'start' => 2.3, 'end' => 2.5],
            ['word' => 'رب', 'start' => 2.6, 'end' => 2.8],
            ['word' => 'العالمين', 'start' => 2.9, 'end' => 3.2],
        ]);

        $this->assertContains('RESTART', array_column($result['extra_words'], 'type'));
        $this->assertContains('HESITATION', array_column($result['events'], 'type'));
        $this->assertNotContains('SUBSTITUTION', array_column($result['word_results'], 'type'));
        $this->assertNotContains('DELETION', array_column($result['word_results'], 'type'));
    }

    public function test_deliberate_single_word_repetition_is_not_a_restart(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'لله', 'start' => 1.6, 'end' => 1.8],
            ['word' => 'رب', 'start' => 1.9, 'end' => 2.1],
            ['word' => 'العالمين', 'start' => 2.2, 'end' => 2.5],
        ]);

        $this->assertSame(['REPETITION'], array_column($result['extra_words'], 'type'));
        $this->assertNotContains('RESTART', array_column($result['extra_words'], 'type'));
        $this->assertSame(0, $result['scenario_counts']['restarts']);
    }

    public function test_live_restart_does_not_finalise_future_omissions(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], ['الحمد', 'لله', 'الحمد', 'لله'], [
            'lifecycle' => 'live',
        ]);

        $this->assertContains('RESTART', array_column($result['extra_words'], 'type'));
        $this->assertSame(['MATCH', 'MATCH', 'UNASSESSED', 'UNASSESSED'], array_column($result['word_results'], 'type'));
        $this->assertNotContains('DELETION', array_column($result['word_results'], 'type'));
    }

    public function test_naturally_repeated_expected_words_are_not_misclassified_as_live_restart(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'الحمد', 'لله'], ['الحمد', 'لله', 'الحمد', 'لله'], [
            'lifecycle' => 'live',
        ]);

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($result['word_results'], 'type'));
        $this->assertNotContains('RESTART', array_column($result['events'], 'type'));
    }

    public function test_compound_edge_cases(): void
    {
        $hesitationSelfCorrection = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.25, 'end' => 0.45],
            ['word' => 'الرحمن', 'start' => 1.9, 'end' => 2.1],
            ['word' => 'رب', 'start' => 2.8, 'end' => 2.95],
            ['word' => 'العالمين', 'start' => 3.0, 'end' => 3.4],
        ]);
        $this->assertContains('SELF_CORRECTION', array_column($hesitationSelfCorrection['extra_words'], 'type'));
        $this->assertContains('HESITATION', array_column($hesitationSelfCorrection['events'], 'type'));

        $repetitionRestart = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], ['الحمد', 'لله', 'لله', 'الحمد', 'لله', 'رب', 'العالمين']);
        $this->assertContains('REPETITION', array_column($repetitionRestart['extra_words'], 'type'));
        $this->assertContains('RESTART', array_column($repetitionRestart['extra_words'], 'type'));

        $substitutionLaterRealignment = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن'], ['الحمد', 'لله', 'رب', 'العظيم', 'الرحمن']);
        $this->assertSame('SUBSTITUTION', $substitutionLaterRealignment['word_results'][3]['type']);
        $this->assertSame('MATCH', $substitutionLaterRealignment['word_results'][4]['type']);

        $skipFast = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.00, 'end' => 0.08],
            ['word' => 'لله', 'start' => 0.09, 'end' => 0.16],
            ['word' => 'العالمين', 'start' => 0.17, 'end' => 0.30],
        ]);
        $this->assertSame(['MATCH', 'MATCH', 'DELETION', 'MATCH'], array_column($skipFast['word_results'], 'type'));

        $driftReturn = $this->alignWords(['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'], ['ا', 'ب', 'س', 'ش', 'ص', 'ح', 'خ']);
        $this->assertContains('DIVERGENCE', array_column($driftReturn['word_results'], 'type'));
        $this->assertContains('REALIGNMENT', array_column($driftReturn['word_results'], 'type'));

        $lowConfidenceCorrect = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'confidence' => 0.18],
            ['word' => 'لله', 'confidence' => 0.19],
            ['word' => 'رب', 'confidence' => 0.2],
            ['word' => 'العالمين', 'confidence' => 0.18],
        ]);
        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'MATCH'], array_column($lowConfidenceCorrect['word_results'], 'type'));
        $this->assertSame(0, $lowConfidenceCorrect['color_counts']['red']);
    }

    public function test_self_correction_immediate_wrong_word_keeps_wrong_token_and_target(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'الرحمن', 'start' => 0.6, 'end' => 0.8, 'token' => 'wrong-token'],
            ['word' => 'رب', 'start' => 1.45, 'end' => 1.65, 'token' => 'correct-token'],
            ['word' => 'العالمين', 'start' => 1.75, 'end' => 2.05],
        ]);

        $self = $result['extra_words'][0];
        $this->assertSame('SELF_CORRECTION', $self['type']);
        $this->assertSame('الرحمن', $self['wrong_token']);
        $this->assertSame('رب', $self['corrected_target_word']);
        $this->assertSame('wrong-token', $self['token']);
        $this->assertSame(0, $result['scenario_counts']['unresolved_mistakes']);
        $this->assertSame(1, $result['scenario_counts']['self_corrected_mistakes']);
        $this->assertSame('correct', $result['word_results'][2]['status']);
    }

    public function test_self_correction_groups_a_wrong_phrase_and_records_one_event(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'العظيم', 'start' => 0.6, 'end' => 0.8],
            ['word' => 'اللطيف', 'start' => 0.9, 'end' => 1.1],
            ['word' => 'رب', 'start' => 1.8, 'end' => 2.0],
            ['word' => 'العالمين', 'start' => 2.1, 'end' => 2.4],
            ['word' => 'الرحمن', 'start' => 2.5, 'end' => 2.8],
            ['word' => 'الرحيم', 'start' => 2.9, 'end' => 3.2],
        ]);

        $this->assertSame(['SELF_CORRECTION', 'SELF_CORRECTION'], array_column($result['extra_words'], 'type'));
        $events = array_values(array_filter($result['events'], static fn (array $event): bool => ($event['type'] ?? '') === 'SELF_CORRECTION'));
        $this->assertCount(1, $events);
        $this->assertSame(['العظيم', 'اللطيف'], $events[0]['wrong_tokens']);
        $this->assertSame(['رب', 'العالمين', 'الرحمن', 'الرحيم'], $events[0]['corrected_target_words']);
        $this->assertSame(0, $result['scenario_counts']['unresolved_mistakes']);
        $this->assertSame(1, $result['scenario_counts']['self_corrected_mistakes']);

        $analysis = (new WeaknessAnalysisService)->analyse(
            $result['word_results'],
            $result['extra_words'],
            $result['color_counts'],
            $result['accuracy']
        );
        $this->assertSame(0, $analysis['error_types']['unresolved_mistakes']);
        $this->assertSame(1, $analysis['error_types']['self_corrected_mistakes']);
        $this->assertSame(['العظيم', 'اللطيف'], $analysis['self_corrected_mistakes'][0]['wrong_tokens']);
    }

    public function test_self_correction_after_a_brief_pause_is_amber(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'الرحمن', 'start' => 0.6, 'end' => 0.8],
            ['word' => 'رب', 'start' => 1.4, 'end' => 1.6],
            ['word' => 'العالمين', 'start' => 1.7, 'end' => 2.0],
        ]);

        $this->assertSame('SELF_CORRECTION', $result['extra_words'][0]['type']);
        $this->assertSame('amber', $result['extra_words'][0]['highlight']);
        $this->assertSame(1, $result['scenario_counts']['self_corrected_mistakes']);
    }

    public function test_unresolved_wrong_word_remains_a_substitution(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد'],
            ['word' => 'لله'],
            ['word' => 'الرحمن'],
            ['word' => 'العالمين'],
        ]);

        $this->assertSame('SUBSTITUTION', $result['word_results'][2]['type']);
        $this->assertSame('wrong', $result['word_results'][2]['status']);
        $this->assertSame(1, $result['scenario_counts']['unresolved_mistakes']);
        $this->assertSame(0, $result['scenario_counts']['self_corrected_mistakes']);
    }

    public function test_repetition_is_not_misclassified_as_self_correction(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], [
            ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
            ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
            ['word' => 'لله', 'start' => 1.4, 'end' => 1.6],
            ['word' => 'رب', 'start' => 1.7, 'end' => 1.9],
            ['word' => 'العالمين', 'start' => 2.0, 'end' => 2.3],
        ]);

        $this->assertSame('REPETITION', $result['extra_words'][0]['type']);
        $this->assertSame(0, $result['scenario_counts']['self_corrected_mistakes']);
        $this->assertSame(1, $result['scenario_counts']['repetitions']);
    }

    public function test_comparison_normalisation_preserves_display_text_separately(): void
    {
        $normalizer = new QuranTextNormalizer;
        $this->assertSame('الحمد لله رب العالمين', $normalizer->normalizeComparisonText('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'));

        $result = $this->alignWords(['ٱلْحَمْدُ', 'لِلَّهِ'], ['الحمد', 'لله']);
        $this->assertSame('ٱلْحَمْدُ', $result['word_results'][0]['displayText']);
        $this->assertSame('الحمد', $result['word_results'][0]['comparisonText']);
    }

    public function test_real_ayah_opening_drift_realigns_without_a_substitution_cascade(): void
    {
        $fatiha = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العالمين'],
            ['الرحمن', 'الرحيم', 'رب', 'العالمين']
        );
        $this->assertSame(
            ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            array_column($fatiha['word_results'], 'type')
        );
        $this->assertSame(['red', 'red', 'green', 'green'], array_column($fatiha['word_results'], 'visual_status'));
        $this->assertSame(['red', 'red', 'green', 'green'], array_column($fatiha['word_results'], 'highlight'));
        $this->assertSame([0, 1, 2, 3], array_column($fatiha['word_results'], 'recognised_index'));
        $this->assertSame(2, $fatiha['scenario_counts']['divergence_events']);

        $second = $this->alignWords(
            ['رب', 'العالمين', 'الرحمن', 'الرحيم'],
            ['الحمد', 'لله', 'الرحمن', 'الرحيم']
        );
        $this->assertSame(
            ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            array_column($second['word_results'], 'type')
        );
        $this->assertSame('green', $second['word_results'][2]['visual_status']);
        $this->assertSame(2, $second['word_results'][2]['recognised_index']);
        $this->assertSame('green', $second['word_results'][3]['visual_status']);

        $ikhlas = $this->alignWords(
            ['قل', 'هو', 'الله', 'أحد'],
            ['الله', 'الصمد', 'الله', 'أحد']
        );
        $this->assertSame(
            ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            array_column($ikhlas['word_results'], 'type')
        );
        $this->assertSame([0, 1, 2, 3], array_column($ikhlas['word_results'], 'recognised_index'));
        $this->assertSame(2, $ikhlas['scenario_counts']['divergence_events']);

        $leftAndReturned = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم'],
            ['الحمد', 'لله', 'مالك', 'الدين', 'الرحمن', 'الرحيم']
        );
        $this->assertSame(
            ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
            array_column($leftAndReturned['word_results'], 'type')
        );
        $this->assertSame('green', $leftAndReturned['word_results'][4]['highlight']);
        $this->assertSame('green', $leftAndReturned['word_results'][5]['visual_status']);
    }

    public function test_real_ayah_drift_without_return_keeps_the_unread_tail_pending_until_final(): void
    {
        $expected = ['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم'];
        $heard = ['الحمد', 'لله', 'مالك', 'يوم', 'الدين'];
        $live = $this->alignWords($expected, $heard, ['lifecycle' => 'live']);
        $final = $this->alignWords($expected, $heard);

        $this->assertSame(
            ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'UNASSESSED'],
            array_column($live['word_results'], 'type')
        );
        $this->assertSame('neutral', $live['word_results'][5]['highlight']);
        $this->assertNotSame('red', $live['word_results'][5]['visual_status']);
        $this->assertSame(
            ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'DELETION'],
            array_column($final['word_results'], 'type')
        );
        $this->assertSame('red', $final['word_results'][5]['visual_status']);
        $this->assertNotContains('REALIGNMENT', array_column($final['word_results'], 'type'));
    }

    public function test_one_shared_allah_is_not_a_realignment_anchor(): void
    {
        $result = $this->alignWords(
            ['قل', 'هو', 'الله', 'أحد'],
            ['قل', 'هو', 'الصمد', 'الله']
        );

        $this->assertNotContains('REALIGNMENT', array_column($result['word_results'], 'type'));
    }

    public function test_low_confidence_ayah_drift_stays_unassessed(): void
    {
        $result = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العالمين'],
            [
                ['word' => 'الحمد', 'confidence' => 0.95],
                ['word' => 'لله', 'confidence' => 0.95],
                ['word' => 'الرحمن', 'confidence' => 0.2],
                ['word' => 'الرحيم', 'confidence' => 0.2],
            ]
        );

        $this->assertNotContains('DIVERGENCE', array_column($result['word_results'], 'type'));
        $this->assertContains('UNASSESSED', array_slice(array_column($result['word_results'], 'type'), 2));
    }

    public function test_real_ayah_self_correction_does_not_leave_deletions(): void
    {
        $result = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العالمين'],
            [
                ['word' => 'الحمد', 'start' => 0.0, 'end' => 0.2],
                ['word' => 'لله', 'start' => 0.3, 'end' => 0.5],
                ['word' => 'الرحمن', 'start' => 0.6, 'end' => 0.8],
                ['word' => 'الرحيم', 'start' => 0.9, 'end' => 1.1],
                ['word' => 'رب', 'start' => 2.0, 'end' => 2.2],
                ['word' => 'العالمين', 'start' => 2.3, 'end' => 2.5],
            ]
        );

        $this->assertContains('SELF_CORRECTION', array_column($result['events'], 'type'));
        $this->assertNotContains('DELETION', array_column($result['word_results'], 'type'));
        $this->assertSame(0, $result['scenario_counts']['unresolved_mistakes']);
        $this->assertSame(
            ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
    }

    public function test_accent_labels_do_not_turn_letter_swaps_into_matches(): void
    {
        $result = $this->alignWords(
            ['الحمد', 'لله', 'رب', 'العَٰلَمِينَ', 'الصلاة', 'الصراط', 'ملك'],
            [
                ['word' => 'الحمد', 'voice_profile' => 'egyptian', 'accent_hint' => 'maghrebi', 'loudness' => 0.9],
                ['word' => 'لله', 'voice_profile' => 'egyptian', 'accent_hint' => 'maghrebi', 'loudness' => 0.9],
                ['word' => 'رب', 'voice_profile' => 'egyptian'],
                ['word' => 'العلمين', 'accent_hint' => 'egyptian'],
                ['word' => 'الصلاه', 'voice_profile' => 'maghrebi'],
                ['word' => 'السراط', 'voice_profile' => 'egyptian', 'accent_hint' => 'egyptian'],
                ['word' => 'مالك', 'loudness' => 0.2],
            ]
        );

        $this->assertSame(
            ['MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION', 'MATCH'],
            array_column($result['word_results'], 'type')
        );
        $this->assertNotSame('green', $result['word_results'][5]['visual_status']);
    }

    /**
     * @param  list<string>  $expected
     * @param  list<string|array<string,mixed>>  $heard
     * @param  array<string,mixed>  $options
     * @return array<string,mixed>
     */
    private function alignWords(array $expected, array $heard, array $options = []): array
    {
        $service = new QuranAlignmentService;
        $recognition = array_map(static function ($entry) {
            if (is_array($entry)) {
                return array_merge(['confidence' => 0.95], $entry);
            }

            return ['word' => $entry, 'confidence' => 0.95];
        }, $heard);

        return $service->align(
            [['ayah_number' => 2, 'surah_number' => 1, 'words' => $expected]],
            $recognition,
            '',
            $options
        );
    }
}
