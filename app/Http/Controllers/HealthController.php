<?php

namespace App\Http\Controllers;

use App\Services\Health\HealthCheckService;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    /**
     * Public readiness for external uptime monitors.
     * Body is status only — never diagnostics, hosts, or secrets.
     */
    public function __invoke(HealthCheckService $health): JsonResponse
    {
        $payload = $health->publicPayload();
        $status = $payload['status'];

        $http = match ($status) {
            'unavailable' => 503,
            default => 200,
        };

        return response()->json($payload, $http)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
}
