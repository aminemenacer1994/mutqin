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

    public function test_live_alignment_does_not_mark_future_words_deleted(): void
    {
        $result = $this->alignWords(['الحمد', 'لله', 'رب', 'العالمين'], ['الحمد', 'لله', 'رب'], [
            'lifecycle' => 'live',
        ]);

        $this->assertSame(['MATCH', 'MATCH', 'MATCH', 'UNASSESSED'], array_column($result['word_results'], 'type'));
        $this->assertSame('uncertain', $result['word_results'][3]['status']);
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

    public function test_comparison_normalisation_preserves_display_text_separately(): void
    {
        $normalizer = new \App\Services\Memorisation\QuranTextNormalizer;
        $this->assertSame('الحمد لله رب العالمين', $normalizer->normalizeComparisonText('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'));

        $result = $this->alignWords(['ٱلْحَمْدُ', 'لِلَّهِ'], ['الحمد', 'لله']);
        $this->assertSame('ٱلْحَمْدُ', $result['word_results'][0]['displayText']);
        $this->assertSame('الحمد', $result['word_results'][0]['comparisonText']);
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
