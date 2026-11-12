<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Analytics\GrowthAnalyticsService;
use App\Services\Analytics\PostHogQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class GrowthController extends Controller
{
    private const CACHE_SECONDS = 90;

    public function show(Request $request, GrowthAnalyticsService $growth, PostHogQueryClient $posthog): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null && $user->can('access-admin'), 403);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'refresh' => ['nullable', 'boolean'],
        ]);

        $timezone = GrowthAnalyticsService::TIMEZONE;
        $today = now($timezone)->startOfDay();
        $to = isset($validated['to'])
            ? Carbon::parse($validated['to'], $timezone)->startOfDay()
            : $today->copy();
        $from = isset($validated['from'])
            ? Carbon::parse($validated['from'], $timezone)->startOfDay()
            : $to->copy()->subDays(29)->startOfDay();

        if ($from->gt($to)) {
            return $this->jsonError('The start date must be on or before the end date.');
        }

        if ($to->gt($today)) {
            return $this->jsonError('The end date cannot be after today.');
        }

        if ($from->diffInDays($to) > 120) {
            return $this->jsonError('Choose a range of 120 days or fewer.');
        }

        $refresh = $request->boolean('refresh');
        $cacheKey = 'admin-growth:v1:'.$from->toDateString().':'.$to->toDateString();
        if ($refresh) {
            Cache::forget($cacheKey);
            $posthog->forget($from, $to);
        }

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $this->jsonReport($this->withFreshness($cached, true));
        }

        $report = $this->withFreshness($growth->build($from, $to), false);
        Cache::put($cacheKey, $report, self::CACHE_SECONDS);

        return $this->jsonReport($report);
    }

    /**
     * @param  array<string, mixed>  $report
     * @return array<string, mixed>
     */
    private function withFreshness(array $report, bool $fromCache): array
    {
        $generated = Carbon::parse((string) ($report['generated_at'] ?? now()->toIso8601String()));
        $age = max(0, (int) round(abs($generated->diffInSeconds(now()))));
        $posthog = (string) ($report['consistency']['posthog']['status'] ?? 'unconfigured');
        if ($fromCache) {
            $status = $age > 180 ? 'stale' : 'cached';
        } elseif ($posthog === 'ok') {
            $status = 'live';
        } else {
            $status = 'partial';
        }

        $report['freshness'] = [
            'status' => $status,
            'cached' => $fromCache,
            'age_seconds' => $age,
            'generated_at' => $generated->toIso8601String(),
            'posthog' => $posthog,
        ];

        return $report;
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function jsonReport(array $report): JsonResponse
    {
        return response()
            ->json($report)
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Vary', 'Cookie');
    }

    private function jsonError(string $message): JsonResponse
    {
        return response()->json(['message' => $message], 422);
    }
}
