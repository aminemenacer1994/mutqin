<?php

namespace App\Services\Memorisation;

/**
 * One central policy for provider confidence vs Mutqin classification confidence.
 *
 * Speechmatics confidence is evidence about recognition quality, not a direct
 * memorisation verdict. Low ASR confidence alone never creates a red mistake.
 */
class RecitationConfidencePolicy
{
    public const VERSION = 'mutqin-confidence-v2';

    public function isRecognitionUsable(float $confidence): bool
    {
        return $confidence >= RecitationScoringThresholds::DROP_HEARD_CONFIDENCE_BELOW;
    }

    public function shouldUnassessMismatch(float $speechmaticsConfidence, bool $lexicalMatch): bool
    {
        return ! $lexicalMatch
            && $speechmaticsConfidence < RecitationScoringThresholds::UNCERTAIN_CONFIDENCE;
    }

    public function classificationConfidence(
        float $similarity,
        float $speechmaticsConfidence,
        bool $lexicalMatch,
        int $anchorSupport = 0
    ): float {
        if ($lexicalMatch) {
            $score = 0.72 + (min(2, $anchorSupport) * 0.08);
            return round(min(0.99, $score), 4);
        }

        $score = ($speechmaticsConfidence * 0.42)
            + ($similarity * 0.34)
            + (min(2, $anchorSupport) * 0.08);

        return round(max(0.12, min(0.96, $score)), 4);
    }
}
