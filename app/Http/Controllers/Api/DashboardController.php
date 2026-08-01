<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DashboardResource;
use App\Services\DashboardService;
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

        $payload = $dashboard->build($user, $days);

        return (new DashboardResource($payload))
            ->response()
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

        return response()
            ->json([
                'activity' => $dashboard->activityLog($user, $limit),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Vary', 'Cookie');
    }
}
