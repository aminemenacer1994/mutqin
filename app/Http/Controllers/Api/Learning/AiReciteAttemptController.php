<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use App\Services\Learning\SessionAnalysisQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiReciteAttemptController extends Controller
{
    public function index(Request $request, SessionAnalysisQueryService $analysis): JsonResponse
    {
        return response()->json([
            'attempts' => $analysis->attemptHistory($request->user()),
        ]);
    }

    public function stats(Request $request, SessionAnalysisQueryService $analysis): JsonResponse
    {
        return response()->json([
            'stats' => $analysis->dashboardStats($request->user()),
        ]);
    }

    public function show(Request $request, int $attempt, SessionAnalysisQueryService $analysis): JsonResponse
    {
        $payload = $analysis->forAttempt($request->user(), $attempt);
        if ($payload === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json($payload);
    }

    public function markPeek(Request $request, int $attempt, SessionAnalysisQueryService $analysis): JsonResponse
    {
        $updated = $analysis->markPeekUsed($request->user(), $attempt);
        if ($updated === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        DashboardService::forgetForUser($request->user());

        return response()->json([
            'attempt' => [
                'id' => $updated->id,
                'peek_used' => (bool) $updated->peek_used,
            ],
        ]);
    }
}
