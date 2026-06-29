<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveAnalyticsRequest;
use App\Models\LearningAnalytic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LearningAnalytic::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('session_date');

        if ($request->filled('from')) {
            $query->whereDate('session_date', '>=', Carbon::parse($request->query('from'))->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('session_date', '<=', Carbon::parse($request->query('to'))->toDateString());
        }

        return response()->json(['analytics' => $query->get()]);
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

        return response()->json(['saved' => true, 'analytic' => $analytic]);
    }
}
