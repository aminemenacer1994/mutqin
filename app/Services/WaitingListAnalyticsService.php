<?php

namespace App\Services;

use App\Models\WaitingListEntry;

class WaitingListAnalyticsService
{
    public function report(): array
    {
        // Database timestamps and report boundaries use UTC on all database drivers.
        $today = now('UTC')->startOfDay();
        $query = WaitingListEntry::query();
        $summary = (clone $query)->selectRaw(
            'COUNT(*) AS total, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_7_days, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_30_days',
            [$today, $today->copy()->subDays(6), $today->copy()->subDays(29)]
        )->first();

        $breakdown = static function (string $column) use ($query): array {
            $totals = [];
            foreach ((clone $query)->selectRaw("{$column} AS label, COUNT(*) AS total")->groupBy($column)->get() as $row) {
                $label = $row->label ?: 'unknown';
                $totals[$label] = ($totals[$label] ?? 0) + (int) $row->total;
            }
            arsort($totals);

            return collect($totals)->map(fn ($total, $label) => ['label' => $label, 'total' => $total])->values()->all();
        };
        $dailyCounts = (clone $query)->where('created_at', '>=', $today->copy()->subDays(29))
            ->selectRaw('DATE(created_at) AS day, COUNT(*) AS total')
            ->groupByRaw('DATE(created_at)')->pluck('total', 'day');
        $daily = [];
        for ($offset = 29; $offset >= 0; $offset--) {
            $day = $today->copy()->subDays($offset)->toDateString();
            $daily[] = ['day' => $day, 'total' => (int) ($dailyCounts[$day] ?? 0)];
        }

        return [
            'summary' => [
                'total' => (int) ($summary->total ?? 0),
                'today' => (int) ($summary->today ?? 0),
                'last_7_days' => (int) ($summary->last_7_days ?? 0),
                'last_30_days' => (int) ($summary->last_30_days ?? 0),
            ],
            'first_sources' => $breakdown('first_source'),
            'last_sources' => $breakdown('last_source'),
            'campaigns' => $breakdown('last_campaign'),
            'daily' => $daily,
            'timezone' => 'UTC',
        ];
    }
}
