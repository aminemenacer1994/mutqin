<?php

namespace Tests\Unit;

use App\Services\Memorisation\PracticePlanRecommendationService;
use App\Services\Memorisation\RecitationScoringThresholds;
use PHPUnit\Framework\TestCase;

class PracticePlanRecommendationServiceTest extends TestCase
{
    private PracticePlanRecommendationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PracticePlanRecommendationService;
    }

    public function test_accuracy_bands_follow_scoring_thresholds(): void
    {
        $strong = RecitationScoringThresholds::STRONG_ACCURACY_MIN;
        $developing = RecitationScoringThresholds::DEVELOPING_ACCURACY_MIN;

        $this->assertSame(PracticePlanRecommendationService::BAND_STRONG, $this->service->band($strong));
        $this->assertSame(PracticePlanRecommendationService::BAND_STRONG, $this->service->band(100));
        $this->assertSame(PracticePlanRecommendationService::BAND_FOCUSED, $this->service->band($strong - 1));
        $this->assertSame(PracticePlanRecommendationService::BAND_FOCUSED, $this->service->band($developing));
        $this->assertSame(PracticePlanRecommendationService::BAND_GENTLE, $this->service->band($developing - 1));
        $this->assertSame(PracticePlanRecommendationService::BAND_GENTLE, $this->service->band(0));
    }

    public function test_empty_weak_ayahs_keep_the_full_session_range(): void
    {
        $range = $this->service->resolvePracticeRange(3, 1, [], []);

        $this->assertSame(1, $range['from']);
        $this->assertSame(3, $range['to']);
        $this->assertSame(3, $range['count']);
        $this->assertSame([], $range['focus_ayahs']);
    }

    public function test_wide_weak_span_collapses_to_the_densest_three_ayah_window(): void
    {
        $weakWords = [];
        foreach ([10, 11, 12] as $ayah) {
            $weakWords[] = ['ayahNumber' => $ayah];
            $weakWords[] = ['ayahNumber' => $ayah];
        }
        $weakWords[] = ['ayahNumber' => 6];

        $range = $this->service->resolvePracticeRange(1, 20, [6, 10, 11, 12, 15], $weakWords);

        $this->assertSame(10, $range['from']);
        $this->assertSame(12, $range['to']);
        $this->assertSame(3, $range['count']);
        $this->assertSame([10, 11, 12], $range['focus_ayahs']);
    }

    public function test_weak_ayahs_outside_the_session_are_ignored(): void
    {
        $range = $this->service->resolvePracticeRange(5, 6, [1, 5, 40], [
            ['ayahNumber' => 5],
        ]);

        $this->assertSame(5, $range['from']);
        $this->assertSame(5, $range['to']);
        $this->assertSame([5], $range['focus_ayahs']);
    }

    public function test_strong_band_selects_blur_and_gentle_band_selects_talqin(): void
    {
        $strong = $this->service->selectTechniques([
            'band' => PracticePlanRecommendationService::BAND_STRONG,
            'weak_words' => [],
            'weak_ayahs' => [],
        ]);
        $gentle = $this->service->selectTechniques([
            'band' => PracticePlanRecommendationService::BAND_GENTLE,
            'weak_words' => [],
            'weak_ayahs' => [1],
            'ayah_word_counts' => [1 => 8],
        ]);

        $this->assertSame('blur', $strong[0]['id']);
        $this->assertSame('talqin', $gentle[0]['id']);
    }

    public function test_two_to_four_hard_words_select_anchor_without_a_second_technique(): void
    {
        $techniques = $this->service->selectTechniques([
            'band' => PracticePlanRecommendationService::BAND_FOCUSED,
            'weak_words' => [
                ['ayahNumber' => 4, 'severity' => 'red'],
                ['ayahNumber' => 4, 'severity' => 'black'],
            ],
            'weak_ayahs' => [4],
            'ayah_word_counts' => [4 => 10],
        ]);

        $this->assertCount(1, $techniques);
        $this->assertSame('anchor', $techniques[0]['id']);
    }

    public function test_recommend_builds_a_persisted_plan_shape_and_slows_a_fast_recitation(): void
    {
        $plan = $this->service->recommend(
            [
                'weak_words' => [
                    ['ayahNumber' => 2, 'severity' => 'red', 'text' => 'الرحمن'],
                    ['ayahNumber' => 2, 'severity' => 'black', 'text' => 'الرحيم'],
                ],
                'weak_ayahs' => [2],
                'ayah_results' => [[
                    'ayah_number' => 2,
                    'correct' => 2,
                    'minor_mistake' => 0,
                    'wrong' => 1,
                    'missing' => 1,
                    'uncertain' => 0,
                    'priority' => 'attention',
                ]],
                'color_counts' => ['red' => 1, 'black' => 1, 'amber' => 0],
                'error_pattern' => 'word_focus',
                'weak_phrases' => [],
            ],
            [
                'surah_number' => 1,
                'surah_name' => 'Al-Fatihah',
                'start_ayah' => 1,
                'end_ayah' => 3,
            ],
            72,
            1_000,
            4
        );

        $this->assertSame(PracticePlanRecommendationService::BAND_FOCUSED, $plan['band']);
        $this->assertSame(2, $plan['start_ayah']);
        $this->assertSame(2, $plan['end_ayah']);
        $this->assertSame('anchor', $plan['config']['technique']);
        $this->assertTrue($plan['config']['anchor_mode_enabled']);
        $this->assertFalse($plan['config']['blur_enabled']);
        $this->assertSame(1.25, $plan['config']['playback_speed']);
        $this->assertSame('fast', $plan['config']['recitation_pace']['tone']);
        $this->assertStringContainsString('pace was quick', $plan['why']);
        $this->assertSame('Al-Fatihah · Ayah 2', $plan['range']['label']);
    }
}
