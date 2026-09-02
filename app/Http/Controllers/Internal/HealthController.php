<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Services\Health\HealthCheckService;
use App\Support\Monitoring\MonitoringAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    /**
     * Detailed readiness for operators. Safe codes only — no stack traces,
     * credentials, env dumps, or internal hostnames.
     */
    public function __invoke(Request $request, HealthCheckService $health): JsonResponse
    {
        if (! MonitoringAccess::internalAllowed($request)) {
            abort(404);
        }

        $result = $health->run(true);
        $http = $result['status'] === 'unavailable' ? 503 : 200;

        return response()->json([
            'status' => $result['status'],
            'checks' => $result['checks'],
        ], $http)->header('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
}
