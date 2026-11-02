<?php

namespace Tests\Unit;

use App\Services\Memorisation\RecitationConfidencePolicy;
use App\Services\Memorisation\RecitationScoringThresholds;
use PHPUnit\Framework\TestCase;

class RecitationConfidencePolicyTest extends TestCase
{
    private RecitationConfidencePolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new RecitationConfidencePolicy;
    }

    public function test_recognition_below_drop_threshold_is_unusable(): void
    {
        $floor = RecitationScoringThresholds::DROP_HEARD_CONFIDENCE_BELOW;

        $this->assertFalse($this->policy->isRecognitionUsable($floor - 0.01));
        $this->assertTrue($this->policy->isRecognitionUsable($floor));
        $this->assertTrue($this->policy->isRecognitionUsable(0.99));
    }

    public function test_low_confidence_mismatch_is_unassessed_and_a_lexical_match_is_not(): void
    {
        $uncertain = RecitationScoringThresholds::UNCERTAIN_CONFIDENCE;

        $this->assertTrue($this->policy->shouldUnassessMismatch($uncertain - 0.01, false));
        $this->assertFalse($this->policy->shouldUnassessMismatch($uncertain, false));
        $this->assertFalse($this->policy->shouldUnassessMismatch(0.1, true));
    }

    public function test_lexical_match_confidence_rises_with_anchor_support_and_stays_bounded(): void
    {
        $plain = $this->policy->classificationConfidence(0.2, 0.2, true, 0);
        $anchored = $this->policy->classificationConfidence(0.2, 0.2, true, 5);

        $this->assertSame(0.72, $plain);
        $this->assertSame(0.88, $anchored);
        $this->assertLessThanOrEqual(0.99, $anchored);
    }

    public function test_non_match_confidence_blends_speech_and_similarity_inside_bounds(): void
    {
        $low = $this->policy->classificationConfidence(0.0, 0.0, false, 0);
        $high = $this->policy->classificationConfidence(1.0, 1.0, false, 8);

        $this->assertSame(0.12, $low);
        $this->assertGreaterThan($low, $high);
        $this->assertLessThanOrEqual(0.96, $high);
    }
}
