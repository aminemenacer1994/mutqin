<?php

namespace Tests\Unit;

use App\Services\Memorisation\QuranAlignmentService;
use App\Services\Memorisation\WeaknessAnalysisService;
use PHPUnit\Framework\TestCase;

class WeaknessAnalysisServiceTest extends TestCase
{
    private WeaknessAnalysisService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WeaknessAnalysisService;
    }

    public function test_empty_attempt_is_strong_with_no_weak_items(): void
    {
        $analysis = $this->service->analyse([], [], ['green' => 0], 100);

        $this->assertSame([], $analysis['weak_ayahs']);
        $this->assertSame([], $analysis['weak_words']);
        $this->assertSame('strong', $analysis['error_pattern']);
        $this->assertSame('low', $analysis['priority']);
        $this->assertSame(0, $analysis['error_types']['extra']);
    }

    public function test_uncertain_words_are_counted_but_not_stored_as_weaknesses(): void
    {
        $words = [$this->word(1, 0, 'uncertain', '1:1', 'بسم')];
        for ($index = 1; $index < 10; $index++) {
            $words[] = $this->word(1, $index, 'correct', '1:1', 'كلمة');
        }

        $analysis = $this->service->analyse($words, [], [], 90);

        $this->assertSame([], $analysis['weak_words']);
        $this->assertSame([], $analysis['weak_ayahs']);
        $this->assertSame(1, $analysis['error_types']['uncertain']);
        $this->assertSame('strong', $analysis['ayah_results'][0]['priority']);
    }

    public function test_missing_and_wrong_words_form_a_phrase_and_a_local_cluster(): void
    {
        $analysis = $this->service->analyse([
            $this->word(2, 0, 'wrong', '2:255', 'الله', QuranAlignmentService::TYPE_SUBSTITUTION, 'الرحمن'),
            $this->word(2, 1, 'missing', '2:255', 'لا', QuranAlignmentService::TYPE_DELETION),
            $this->word(2, 2, 'correct', '2:255', 'اله'),
            $this->word(2, 3, 'correct', '2:255', 'الا'),
        ], [], ['red' => 1, 'black' => 1], 50);

        $this->assertSame([2], $analysis['weak_ayahs']);
        $this->assertCount(2, $analysis['weak_words']);
        $this->assertSame('red', $analysis['weak_words'][0]['severity']);
        $this->assertSame('black', $analysis['weak_words'][1]['severity']);
        $this->assertSame(2, $analysis['weak_words'][0]['surahId']);
        $this->assertSame('الله لا', $analysis['weak_phrases'][0]['text']);
        $this->assertSame('local', $analysis['error_clusters'][0]['type']);
        $this->assertSame('concentrated', $analysis['error_pattern']);
        $this->assertSame('high', $analysis['priority']);
        $this->assertSame('الرحمن', $analysis['substitutions'][0]['actual']);
        $this->assertSame(2, $analysis['error_types']['unresolved_mistakes']);
    }

    public function test_self_correction_is_not_an_unresolved_mistake(): void
    {
        $analysis = $this->service->analyse(
            [$this->word(1, 0, 'correct', '112:1', 'قل')],
            [[
                'type' => QuranAlignmentService::TYPE_SELF_CORRECTION,
                'self_correction_group_id' => 'g1',
                'corrected_target_word' => 'قل',
                'recognised_word' => 'كل',
            ]],
            [],
            90
        );

        $this->assertSame(1, $analysis['error_types']['self_corrected_mistakes']);
        $this->assertSame(0, $analysis['error_types']['unresolved_mistakes']);
        $this->assertSame(['كل'], $analysis['self_corrected_mistakes'][0]['wrong_tokens']);
        $this->assertSame('قل', $analysis['self_corrected_mistakes'][0]['corrected_target_word']);
    }

    public function test_scattered_errors_across_ayahs_are_labelled_scattered(): void
    {
        $words = [];
        foreach ([1, 2, 3] as $ayah) {
            $words[] = $this->word($ayah, 0, 'wrong', "2:{$ayah}", 'كلمة', QuranAlignmentService::TYPE_SUBSTITUTION, 'اخرى');
            $words[] = $this->word($ayah, 1, 'missing', "2:{$ayah}", 'ثانية', QuranAlignmentService::TYPE_DELETION);
        }

        $analysis = $this->service->analyse($words, [], [], 40);

        $this->assertSame([1, 2, 3], $analysis['weak_ayahs']);
        $this->assertSame('scattered', $analysis['error_pattern']);
        $this->assertCount(3, $analysis['error_clusters']);
    }

    public function test_words_without_an_ayah_number_do_not_create_ayah_results(): void
    {
        $analysis = $this->service->analyse([
            $this->word(0, 0, 'wrong', '', 'orphan'),
        ]);

        $this->assertSame([], $analysis['ayah_results']);
        $this->assertSame([], $analysis['weak_ayahs']);
        $this->assertSame('word_focus', $analysis['error_pattern']);
    }

    /**
     * @return array<string, mixed>
     */
    private function word(
        int $ayah,
        int $index,
        string $status,
        string $key,
        string $text,
        string $type = '',
        string $actual = ''
    ): array {
        return [
            'ayah_number' => $ayah,
            'ayah_word_index' => $index,
            'status' => $status,
            'ayah_key' => $key,
            'text' => $text,
            'type' => $type,
            'actual' => $actual,
            'confidence' => 0.9,
        ];
    }
}
