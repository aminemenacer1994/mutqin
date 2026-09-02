<?php

namespace App\Services\Memorisation;

/**
 * Central AI recitation scoring / comparison thresholds.
 *
 * Keep in sync with resources/js/scripts/engine/recitationThresholds.js.
 */
final class RecitationScoringThresholds
{
    public const SOFT_SIMILARITY_CAP = 0.74;

    public const CORRECT_SIMILARITY = 0.79;

    public const PARTIAL_SIMILARITY = 0.48;

    public const UNCERTAIN_CONFIDENCE = 0.55;

    public const MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT = 0.55;

    public const DROP_HEARD_CONFIDENCE_BELOW = 0.15;

    public const MIN_RECOGNITION_CONFIDENCE = 0.35;

    public const MIN_EVALUATION_CONFIDENCE_FOR_STRONG = 0.45;

    public const MIN_RECORDING_SECONDS = 1.5;

    public const MIN_USABLE_SPEECH_SECONDS = 0.8;

    public const STRONG_ACCURACY_MIN = 80;

    public const DEVELOPING_ACCURACY_MIN = 55;

    public const PARTIAL_ACCURACY_WEIGHT = 0.4;

    public const UNCERTAIN_ACCURACY_WEIGHT = 0.35;

    public const EXTRA_PENALTY = 0.2;

    /**
     * @return array<string, float|int>
     */
    public static function all(): array
    {
        return [
            'soft_similarity_cap' => self::SOFT_SIMILARITY_CAP,
            'correct_similarity' => self::CORRECT_SIMILARITY,
            'partial_similarity' => self::PARTIAL_SIMILARITY,
            'uncertain_confidence' => self::UNCERTAIN_CONFIDENCE,
            'min_confidence_for_similarity_correct' => self::MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT,
            'drop_heard_confidence_below' => self::DROP_HEARD_CONFIDENCE_BELOW,
            'min_recognition_confidence' => self::MIN_RECOGNITION_CONFIDENCE,
            'min_evaluation_confidence_for_strong' => self::MIN_EVALUATION_CONFIDENCE_FOR_STRONG,
            'min_recording_seconds' => self::MIN_RECORDING_SECONDS,
            'min_usable_speech_seconds' => self::MIN_USABLE_SPEECH_SECONDS,
            'strong_accuracy_min' => self::STRONG_ACCURACY_MIN,
            'developing_accuracy_min' => self::DEVELOPING_ACCURACY_MIN,
            'partial_accuracy_weight' => self::PARTIAL_ACCURACY_WEIGHT,
            'uncertain_accuracy_weight' => self::UNCERTAIN_ACCURACY_WEIGHT,
            'extra_penalty' => self::EXTRA_PENALTY,
        ];
    }
}
