<?php

namespace App\Http\Controllers\Api\Memorisation;

use App\Http\Controllers\Controller;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationAttemptComparison;
use App\Services\Memorisation\MemorisationHistoryQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemorisationHistoryController extends Controller
{
    public function __construct(
        private readonly MemorisationHistoryQueryService $history,
    ) {}

    public function attemptIndex(Request $request): JsonResponse
    {
        $paginator = $this->history->attemptHistory(
            $request->user(),
            (int) $request->integer('per_page', 20)
        );

        return response()->json($paginator);
    }

    public function attemptShow(Request $request, MemorisationAssessment $assessment): JsonResponse
    {
        $this->authorize('view', $assessment);

        return response()->json(
            $this->history->attemptDetail($request->user(), $assessment)
        );
    }

    public function sessionIndex(Request $request): JsonResponse
    {
        $paginator = $this->history->sessionAttemptHistory(
            $request->user(),
            (int) $request->integer('per_page', 20)
        );

        return response()->json($paginator);
    }

    public function weakSpots(Request $request): JsonResponse
    {
        $paginator = $this->history->weakSpotHistory(
            $request->user(),
            (int) $request->integer('per_page', 30),
            $request->query('status')
        );

        return response()->json($paginator);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $paginator = $this->history->recommendationHistory(
            $request->user(),
            (int) $request->integer('per_page', 20)
        );

        return response()->json($paginator);
    }

    public function comparisonShow(Request $request, MemorisationAttemptComparison $comparison): JsonResponse
    {
        $this->authorize('view', $comparison);

        return response()->json(
            $this->history->comparisonDetail($request->user(), $comparison)
        );
    }

    public function comparisonLookup(Request $request): JsonResponse
    {
        $previousId = (int) $request->integer('previous_assessment_id');
        $followUpId = (int) $request->integer('follow_up_assessment_id');
        if ($previousId < 1 || $followUpId < 1) {
            return response()->json(['message' => 'previous_assessment_id and follow_up_assessment_id are required.'], 422);
        }

        $payload = $this->history->comparisonForPair($request->user(), $previousId, $followUpId);
        if ($payload === null) {
            return response()->json(['message' => 'Comparison not found.'], 404);
        }

        return response()->json($payload);
    }

    public function dashboard(Request $request): JsonResponse
    {
        return response()->json(
            $this->history->dashboardSummary($request->user())
        );
    }
}
