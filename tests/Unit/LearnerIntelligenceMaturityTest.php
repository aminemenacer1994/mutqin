<?php

namespace Tests\Unit;

use App\Services\PersonalizedRecommendationEngine;
use App\Services\RepeatAdaptationService;
use PHPUnit\Framework\TestCase;

class LearnerIntelligenceMaturityTest extends TestCase
{
    public function test_sparse_signals_keep_session_only_weights(): void
    {
        $maturity = PersonalizedRecommendationEngine::maturityFromSignals([
            'completed_sessions' => 1,
            'ai_assessments' => 0,
            'technique_decisions' => 0,
            'open_weak_spots' => 0,
            'progress_ayahs' => 4,
        ]);

        $this->assertSame(PersonalizedRecommendationEngine::TIER_SPARSE, $maturity['tier']);
        $this->assertSame(1.0, $maturity['weights']['session_evidence']);
        $this->assertSame(0.0, $maturity['weights']['history']);
        $this->assertSame(0.0, $maturity['weights']['technique_memory']);
    }

    public function test_three_sessions_unlock_forming_history(): void
    {
        $maturity = PersonalizedRecommendationEngine::maturityFromSignals([
            'completed_sessions' => 3,
            'ai_assessments' => 1,
            'technique_decisions' => 2,
            'open_weak_spots' => 1,
            'progress_ayahs' => 12,
        ]);

        $this->assertSame(PersonalizedRecommendationEngine::TIER_FORMING, $maturity['tier']);
        $this->assertGreaterThan(0, $maturity['weights']['history']);
        $this->assertGreaterThan(0, $maturity['weights']['technique_memory']);
    }

    public function test_rich_history_raises_technique_and_weak_spot_weights(): void
    {
        $forming = PersonalizedRecommendationEngine::maturityFromSignals([
            'completed_sessions' => 3,
            'ai_assessments' => 2,
            'technique_decisions' => 3,
            'open_weak_spots' => 2,
            'progress_ayahs' => 12,
        ]);
        $rich = PersonalizedRecommendationEngine::maturityFromSignals([
            'completed_sessions' => 12,
            'ai_assessments' => 8,
            'technique_decisions' => 10,
            'open_weak_spots' => 6,
            'progress_ayahs' => 40,
        ]);

        $this->assertSame(PersonalizedRecommendationEngine::TIER_RICH, $rich['tier']);
        $this->assertGreaterThan($forming['confidence'], $rich['confidence']);
        $this->assertGreaterThan($forming['weights']['technique_memory'], $rich['weights']['technique_memory']);
        $this->assertGreaterThan($forming['weights']['weak_spots'], $rich['weights']['weak_spots']);
    }

    public function test_sparse_technique_memory_does_not_swap_dismissed_method(): void
    {
        $service = new RepeatAdaptationService;
        $result = $service->resolve([
            'technique' => 'focus',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'ai_result' => 'weak',
            'missed_words' => 2,
            'weak_ayahs' => [13],
            'range_ayah_count' => 3,
            'range_narrowed' => true,
            'preferred_technique' => 'talqin',
            'avoid_techniques' => ['focus'],
            'technique_scores' => ['focus' => -2, 'talqin' => 3],
            'maturity' => PersonalizedRecommendationEngine::maturityFromSignals([
                'completed_sessions' => 1,
            ]),
        ]);

        $this->assertSame('focus', $result['technique']);
    }

    public function test_rich_technique_memory_swaps_dismissed_method(): void
    {
        $service = new RepeatAdaptationService;
        $result = $service->resolve([
            'technique' => 'focus',
            'playback_speed' => 1.0,
            'repetitions' => 3,
        ], [
            'confidence' => 'needs_practice',
            'mode' => 'revision',
            'ai_result' => 'weak',
            'missed_words' => 2,
            'weak_ayahs' => [13],
            'range_ayah_count' => 3,
            'range_narrowed' => true,
            'preferred_technique' => 'talqin',
            'avoid_techniques' => ['focus'],
            'technique_scores' => ['focus' => -2, 'talqin' => 3],
            'maturity' => PersonalizedRecommendationEngine::maturityFromSignals([
                'completed_sessions' => 12,
                'ai_assessments' => 6,
                'technique_decisions' => 8,
                'open_weak_spots' => 4,
                'progress_ayahs' => 30,
            ]),
        ]);

        $this->assertSame('talqin', $result['technique']);
    }
}
