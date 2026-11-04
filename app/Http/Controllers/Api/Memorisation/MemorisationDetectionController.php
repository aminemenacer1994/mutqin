<?php

namespace App\Http\Controllers\Api\Memorisation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Memorisation\AdjustMemorisationPracticePlanRequest;
use App\Http\Requests\Memorisation\CompleteMemorisationPracticePlanRequest;
use App\Http\Requests\Memorisation\StoreFailedMemorisationAssessmentRequest;
use App\Http\Requests\Memorisation\StoreMemorisationAssessmentRequest;
use App\Enums\AssignmentKind;
use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Services\DashboardService;
use App\Services\Memorisation\PracticePlanExecutionService;
use App\Services\Memorisation\RecitationAssessmentService;
use App\Services\Teacher\TeacherAssignmentService;
use App\Services\UserAiReciteUsageService;
use App\Support\MutqinLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MemorisationDetectionController extends Controller
{
    private function assertAiVoiceCheckAllowed(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        // Idempotent delivery of an already-saved check must remain readable even
        // after that check reaches the learner's limit.
        $idempotencyKey = trim((string) $request->input('idempotency_key', ''));
        if ($idempotencyKey !== '' && MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->where('idempotency_key', $idempotencyKey)
            ->validScored()
            ->exists()) {
            return null;
        }

        $usage = app(UserAiReciteUsageService::class)->inspect($user);
        if ($usage['allowed']) {
            return null;
        }

        $reason = $usage['reason'] ?? UserAiReciteUsageService::REASON;

        return response()->json([
            'message' => app(UserAiReciteUsageService::class)->learnerMessageForReason($reason),
            'reason' => $reason,
        ], 429);
    }

    public function storeAssessment(
        StoreMemorisationAssessmentRequest $request,
        RecitationAssessmentService $service,
        TeacherAssignmentService $assignments,
    ): JsonResponse {
        if ($blocked = $this->assertAiVoiceCheckAllowed($request)) {
            return $blocked;
        }

        $payload = $request->validated();
        $recipient = $assignments->linkedRecipientForActivity(
            $request->user(),
            $payload['teacher_assignment_recipient_id'] ?? null,
            AssignmentKind::AiRecite,
            (int) ($payload['surah_number'] ?? 0),
            (int) ($payload['start_ayah'] ?? 0),
            (int) ($payload['end_ayah'] ?? 0),
        );
        if ($recipient !== null) {
            $source = (string) ($payload['source'] ?? '');
            $type = (string) ($payload['assessment_type'] ?? '');
            if ($source !== AiReciteAttempt::SOURCE_DASHBOARD && $type !== 'dashboard_ai_recite') {
                throw ValidationException::withMessages([
                    'teacher_assignment_recipient_id' => 'Task recite checks must use the AI recite flow.',
                ]);
            }
            $payload['teacher_assignment_recipient_id'] = $recipient->id;
        }

        try {
            $result = $service->create($request->user(), $payload);
        } catch (\Throwable $exception) {
            MutqinLog::error('memorisation.assessment.failed', [
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => 'We could not assess this attempt.',
            ], 500);
        }
        DashboardService::forgetForUser($request->user());

        MutqinLog::fromRequest($request, 'memorisation.assessment.submitted', [
            'assessment_id' => $result['id'] ?? ($result['assessment']['id'] ?? null),
            'outcome' => $result['match_result'] ?? ($result['assessment']['match_result'] ?? null),
        ]);

        return response()->json($result, ! empty($result['idempotent']) ? 200 : 201);
    }

    public function storeFailedAssessment(
        StoreFailedMemorisationAssessmentRequest $request,
        RecitationAssessmentService $service,
    ): JsonResponse {
        if ($blocked = $this->assertAiVoiceCheckAllowed($request)) {
            return $blocked;
        }

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
        if ($blocked = $this->assertAiVoiceCheckAllowed($request)) {
            return $blocked;
        }

        $payload = $request->validated();
        $payload['previous_assessment_id'] = $practicePlan->assessment_id;
        $payload['session_recommendation_id'] = $practicePlan->session_recommendation_id;
        $payload['assessment_type'] = 'memorisation_retest';

        $result = $service->create($request->user(), $payload);

        return response()->json($result, ! empty($result['idempotent']) ? 200 : 201);
    }
}
