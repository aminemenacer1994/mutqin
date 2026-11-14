<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveAnalyticsRequest;
use App\Models\LearningAnalytic;
use App\Services\DashboardService;
use App\Services\Learning\AdvancedAnalyticsService;
use App\Support\AdvancedAnalyticsAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LearningAnalytic::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('session_date')
            ->orderByDesc('id');

        if ($request->filled('from')) {
            $query->whereDate('session_date', '>=', Carbon::parse($request->query('from'))->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('session_date', '<=', Carbon::parse($request->query('to'))->toDateString());
        } elseif (! $request->filled('from')) {
            // Default bound: last 90 days — avoids unbounded history dumps.
            $query->whereDate('session_date', '>=', now()->subDays(90)->toDateString());
        }

        return response()->json(['analytics' => $query->limit(366)->get()]);
    }

    public function store(SaveAnalyticsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $date = isset($data['session_date'])
            ? Carbon::parse($data['session_date'])->startOfDay()
            : Carbon::now()->startOfDay();

        $analytic = LearningAnalytic::updateOrCreate(
            ['user_id' => $request->user()->id, 'session_date' => $date],
            [
                'sessions_completed' => $data['sessions_completed'] ?? 0,
                'total_minutes' => $data['total_minutes'] ?? 0,
                'ayahs_memorised' => $data['ayahs_memorised'] ?? 0,
                'ayahs_reviewed' => $data['ayahs_reviewed'] ?? 0,
                'streak_day' => $data['streak_day'] ?? 0,
                'metadata' => $data['metadata'] ?? null,
            ]
        );

        $this->authorize('update', $analytic);
        DashboardService::forgetForUser($request->user());

        return response()->json(['saved' => true, 'analytic' => $analytic]);
    }

    public function advanced(Request $request, AdvancedAnalyticsService $service): JsonResponse
    {
        if (! AdvancedAnalyticsAccess::visible($request->user())) {
            return response()->json([
                'message' => 'Advanced Analytics is not available for this account.',
                'reason' => 'super_admin_required',
            ], 403);
        }

        $validated = $request->validate([
            'range' => ['sometimes', Rule::in(['7', '30', '90', 'all', 'custom'])],
            'from' => ['required_if:range,custom', 'nullable', 'date'],
            'to' => ['required_if:range,custom', 'nullable', 'date', 'after_or_equal:from'],
        ]);

        $params = [
            'range' => $validated['range'] ?? '30',
            'from' => $validated['from'] ?? $request->query('from'),
            'to' => $validated['to'] ?? $request->query('to'),
        ];

        return response()->json([
            'report' => $service->build($request->user(), $params),
        ]);
    }
}
