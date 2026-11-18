<?php

namespace App\Support;

/**
 * One ratio for plan and activity progress. Zero activities stay at 0%.
 */
final class ActivityProgress
{
    public static function percent(int $completed, int $total): int
    {
        if ($total <= 0 || $completed <= 0) {
            return 0;
        }

        if ($completed >= $total) {
            return 100;
        }

        return max(0, min(100, (int) round(($completed / $total) * 100)));
    }
}
