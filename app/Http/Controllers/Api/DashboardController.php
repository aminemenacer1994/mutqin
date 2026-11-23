<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DashboardResource;
use App\Services\DashboardService;
use App\Services\Teacher\StudentHifzProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request, DashboardService $dashboard): JsonResponse
    {
        // Never trust a client-supplied user id. Scope exclusively to the session user.
        $user = $request->user();
        abort_unless($user !== null, 401);

        $days = (int) $request->query('days', 30);
        if (! in_array($days, [7, 30], true)) {
            $days = 30;
        }

        if ($request->boolean('fresh')) {
            DashboardService::forgetForUser($user);
        }

        try {
            $payload = $dashboard->build($user, $days);
        } catch (\Throwable $e) {
            report($e);
            $payload = $dashboard->emptyPayload($user, $days);
        }

        return (new DashboardResource($payload))
            ->response()
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Vary', 'Cookie');
    }

    public function progress(Request $request, StudentHifzProgressService $progress): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $window = (string) $request->query('window', 'month');
        if (! in_array($window, ['week', 'month'], true)) {
            $window = 'month';
        }

        return response()
            ->json($progress->forLearner($user, $window))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Vary', 'Cookie');
    }

    public function activity(Request $request, DashboardService $dashboard): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $limit = (int) $request->query('limit', 100);
        if ($limit < 1 || $limit > 200) {
            $limit = 100;
        }
        $offset = max(0, min(500, (int) $request->query('offset', 0)));
        $filters = [
            'type' => $request->query('type'),
            'area' => $request->query('area'),
            'status' => $request->query('status'),
            'kind' => $request->query('kind'),
            'from' => $request->query('from'),
            'to' => $request->query('to'),
            'offset' => $offset,
            'paged' => true,
        ];

        try {
            $activity = $dashboard->activityLog($user, $limit + 1, $filters);
        } catch (\Throwable $e) {
            report($e);
            $activity = [];
        }

        $hasMore = count($activity) > $limit;
        if ($hasMore) {
            $activity = array_slice($activity, 0, $limit);
        }

        return response()
            ->json([
                'activity' => array_values($activity),
                'has_more' => $hasMore,
                'next_offset' => $hasMore ? $offset + $limit : null,
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Vary', 'Cookie');
    }
}
