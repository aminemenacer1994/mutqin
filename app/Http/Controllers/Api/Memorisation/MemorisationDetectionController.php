<?php

namespace App\Http\Controllers\Api\Memorisation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Memorisation\AdjustMemorisationPracticePlanRequest;
use App\Http\Requests\Memorisation\CompleteMemorisationPracticePlanRequest;
use App\Http\Requests\Memorisation\StoreFailedMemorisationAssessmentRequest;
use App\Http\Requests\Memorisation\StoreMemorisationAssessmentRequest;
use App\Models\MemorisationPracticePlan;
use App\Services\DashboardService;
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
        DashboardService::forgetForUser($request->user());

        return response()->json($result, ! empty($result['idempotent']) ? 200 : 201);
    }

    public function storeFailedAssessment(
        StoreFailedMemorisationAssessmentRequest $request,
        RecitationAssessmentService $service,
    ): JsonResponse {
        $payload = $request->validated();
        $assessment = $service->recordFailed(
            $request->user(),
            $payload,
            $payload['idempotency_key'] ?? null,
            (string) ($payload['failure_reason'] ?? 'processing_failed')
        );
        DashboardService::forgetForUser($request->user());

        return response()->json([
            'assessment' => $service->transformAssessment($assessment),
        ], 201);
    }

    public function adjustPlan(
        AdjustMemorisationPracticePlanRequest $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $this->authorize('update', $practicePlan);
        $plan = $execution->adjust($request->user(), $practicePlan, $request->validated());

        return response()->json([
            'practice_plan' => $plan,
        ]);
    }

    public function acceptPlan(
        Request $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $this->authorize('update', $practicePlan);

        return response()->json([
            'practice_plan' => $execution->accept($request->user(), $practicePlan),
        ]);
    }

    public function dismissPlan(
        Request $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $this->authorize('update', $practicePlan);

        return response()->json([
            'practice_plan' => $execution->dismiss($request->user(), $practicePlan),
        ]);
    }

    public function startPlan(
        Request $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $this->authorize('update', $practicePlan);
        $result = $execution->start($request->user(), $practicePlan);

        return response()->json($result);
    }

    public function completePlan(
        CompleteMemorisationPracticePlanRequest $request,
        MemorisationPracticePlan $practicePlan,
        PracticePlanExecutionService $execution,
    ): JsonResponse {
        $this->authorize('update', $practicePlan);
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
        $this->authorize('update', $practicePlan);

        $payload = $request->validated();
        $payload['previous_assessment_id'] = $practicePlan->assessment_id;
        $payload['session_recommendation_id'] = $practicePlan->session_recommendation_id;
        $payload['assessment_type'] = 'memorisation_retest';

        $result = $service->create($request->user(), $payload);

        return response()->json($result, ! empty($result['idempotent']) ? 200 : 201);
    }
}
