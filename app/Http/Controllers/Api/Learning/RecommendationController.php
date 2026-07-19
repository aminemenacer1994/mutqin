<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\RespondToRecommendationRequest;
use App\Models\SessionRecommendation;
use App\Services\NextSessionRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function show(Request $request, NextSessionRecommendationService $service): JsonResponse
    {
        $recommendation = $service->recommend($request->user());

        return response()->json([
            'recommendation' => $recommendation,
        ]);
    }

    public function start(
        RespondToRecommendationRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));

        $result = $service->acceptAndStart($request->user(), $recommendation);

        return response()->json([
            'started' => true,
            'recommendation' => $result['recommendation'],
            'session' => $result['session'],
        ]);
    }

    public function reject(
        RespondToRecommendationRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));
        $choseOther = (bool) ($request->validated('chose_other') ?? true);

        $updated = $service->reject($request->user(), $recommendation, $choseOther);

        return response()->json([
            'rejected' => true,
            'recommendation' => [
                'id' => $updated->id,
                'accepted' => $updated->accepted,
                'chose_other' => $updated->chose_other,
            ],
        ]);
    }

    private function findOwnedRecommendation(Request $request, int $id): SessionRecommendation
    {
        $recommendation = SessionRecommendation::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();

        return $recommendation;
    }
}
