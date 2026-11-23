<?php

namespace App\Services\Parent;

use Illuminate\Support\Carbon;

/**
 * Closed reporting windows. Weeks start on Monday and months are calendar months, in UTC.
 */
final class ParentLearningReportPeriods
{
    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    public function closed(string $cadence, Carbon $now): array
    {
        $now = $now->copy()->utc();
        if ($cadence === 'month') {
            $start = $now->copy()->startOfMonth()->subMonthNoOverflow()->startOfDay();

            return [$start, $start->copy()->endOfMonth()->endOfDay()];
        }

        $start = $now->copy()->startOfWeek(Carbon::MONDAY)->subWeek()->startOfDay();

        return [$start, $start->copy()->addDays(6)->endOfDay()];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    public function containing(string $cadence, Carbon $start): array
    {
        $start = $start->copy()->utc();
        if ($cadence === 'month') {
            $from = $start->copy()->startOfMonth()->startOfDay();

            return [$from, $from->copy()->endOfMonth()->endOfDay()];
        }

        $from = $start->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();

        return [$from, $from->copy()->addDays(6)->endOfDay()];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    public function previous(string $cadence, Carbon $from): array
    {
        $from = $from->copy()->utc()->startOfDay();
        if ($cadence === 'month') {
            $start = $from->copy()->startOfMonth()->subMonthNoOverflow()->startOfDay();

            return [$start, $start->copy()->endOfMonth()->endOfDay()];
        }

        $start = $from->copy()->subWeek();

        return [$start, $start->copy()->addDays(6)->endOfDay()];
    }
}
