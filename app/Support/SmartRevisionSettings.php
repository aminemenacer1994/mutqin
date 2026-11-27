<?php

namespace App\Support;

/**
 * Deterministic smart-revision thresholds and recommendation priority.
 */
final class SmartRevisionSettings
{
    public static function reasonRank(string $code): int
    {
        $ranks = config('mutqin.revision_recommendations.reason_rank', []);
        if (isset($ranks[$code]) && is_numeric($ranks[$code])) {
            return (int) $ranks[$code];
        }

        return (int) ($ranks['default'] ?? 99);
    }

    public static function minWeakSpotAttempts(): int
    {
        return max(1, (int) config('mutqin.revision_recommendations.min_weak_spot_attempts', 2));
    }

    public static function minRecurringMistakeCount(): int
    {
        return max(2, (int) config('mutqin.revision_recommendations.min_recurring_mistake_count', 2));
    }
}