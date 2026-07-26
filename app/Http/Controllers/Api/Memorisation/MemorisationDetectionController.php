<?php

namespace App\Http\Controllers\Api\Memorisation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Memorisation\AdjustMemorisationPracticePlanRequest;
use App\Http\Requests\Memorisation\CompleteMemorisationPracticePlanRequest;
use App\Http\Requests\Memorisation\StoreMemorisationAssessmentRequest;
use App\Models\MemorisationPracticePlan;
use App\Services\Memorisation\PracticePlanExecutionService;
use App\Services\Memorisation\RecitationAssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemorisationDetectionController extends Controller
{
    public function storeAssessment(
        StoreMemorisationAssessmentRequest $request,
        RecitationAssessmentService $service,
    ): JsonResponse {
        $result = $service->create($request->user(), $request->validated());

        return response()->json($result, 201);
    }

    public function adjustPlan(
        AdjustMemorisationPracticePlanRequest $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $plan = $execution->adjust($request->user(), $practicePlan, $request->validated());

        return response()->json([
            'practice_plan' => $plan,
        ]);
    }

    public function startPlan(
        Request $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $result = $execution->start($request->user(), $practicePlan);

        return response()->json($result);
    }

    public function completePlan(
        CompleteMemorisationPracticePlanRequest $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $plan = $execution->complete($request->user(), $practicePlan, $request->validated());

        return response()->json([
            'practice_plan' => $plan,
        ]);
    }

    public function retestPlan(
        StoreMemorisationAssessmentRequest $request,
        MemorisationPracticePlan $practicePlan,
        RecitationAssessmentService $service,
    ): JsonResponse {
        if ((int) $practicePlan->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        $payload = $request->validated();
        $payload['previous_assessment_id'] = $practicePlan->assessment_id;
        $payload['session_recommendation_id'] = $practicePlan->session_recommendation_id;
        $payload['assessment_type'] = 'memorisation_retest';

        $result = $service->create($request->user(), $payload);

        return response()->json($result, 201);
    }
}
