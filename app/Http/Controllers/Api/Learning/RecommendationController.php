<?php

namespace App\Http\Controllers\Api\Learning;

use App\Enums\ConfidenceFeedback;
use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\RespondToRecommendationRequest;
use App\Http\Requests\Learning\SaveRecommendationSettingsRequest;
use App\Http\Requests\Learning\SubmitRecommendationAdaptiveAssessmentRequest;
use App\Http\Requests\Learning\SubmitRecommendationAiAssessmentRequest;
use App\Http\Requests\Learning\SubmitRecommendationConfidenceRequest;
use App\Models\SessionRecommendation;
use App\Services\NextSessionRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function show(Request $request, NextSessionRecommendationService $service): JsonResponse
    {
        $sourceSessionId = $request->query('source_session_id');
        $sourceSession = null;
        if ($sourceSessionId) {
            $sourceSession = \App\Models\UserSession::query()
                ->where('user_id', $request->user()->id)
                ->whereKey((int) $sourceSessionId)
                ->first();
        }

        $recommendation = $sourceSession
            ? ($service->recommendForCompletedSession($request->user(), $sourceSession) ?? $service->recommend($request->user(), $sourceSession))
            : $service->recommend($request->user());

        return response()->json([
            'recommendation' => $recommendation,
        ]);
    }

    public function start(
        RespondToRecommendationRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));
        $overrides = $request->validated('settings') ?? [];

        $result = $service->acceptAndStart($request->user(), $recommendation, is_array($overrides) ? $overrides : []);

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
                'status' => $updated->status?->value ?? $updated->status,
            ],
        ]);
    }

    public function confidence(
        SubmitRecommendationConfidenceRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));
        $feedback = ConfidenceFeedback::from($request->validated('confidence'));
        $validated = $request->validated();

        $payload = $service->submitConfidence(
            $request->user(),
            $recommendation,
            $feedback,
            [
                'plan_detail' => $validated['plan_detail'] ?? null,
                'ayah_range' => $validated['ayah_range'] ?? null,
                'focus_ayahs' => $validated['focus_ayahs'] ?? null,
            ],
        );

        return response()->json([
            'saved' => true,
            'recommendation' => $payload,
        ]);
    }

    public function settings(
        SaveRecommendationSettingsRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));
        $reset = (bool) ($request->validated('reset') ?? false);

        $payload = $reset
            ? $service->resetSettingsOverrides($request->user(), $recommendation)
            : $service->saveSettingsOverrides(
                $request->user(),
                $recommendation,
                $request->validated('settings') ?? []
            );

        return response()->json([
            'saved' => true,
            'recommendation' => $payload,
        ]);
    }

    public function aiAssessment(
        SubmitRecommendationAiAssessmentRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));

        $validated = $request->validated();
        $payload = $service->applyAiAssessment($request->user(), $recommendation, [
            'result' => $validated['result'],
            'summary' => $validated['summary'] ?? null,
            'weak_ayahs' => $validated['weak_ayahs'] ?? [],
            'sequence_errors' => $validated['sequence_errors'] ?? 0,
            'missed_words' => $validated['missed_words'] ?? 0,
            'pronunciation_issues' => (bool) ($validated['pronunciation_issues'] ?? false),
            'color_counts' => is_array($validated['color_counts'] ?? null) ? $validated['color_counts'] : null,
            'plan_detail' => $validated['plan_detail'] ?? null,
            'ayah_range' => $validated['ayah_range'] ?? null,
            'focus_ayahs' => $validated['focus_ayahs'] ?? null,
        ]);

        return response()->json([
            'saved' => true,
            'recommendation' => $payload,
        ]);
    }

    public function adaptiveAssessment(
        SubmitRecommendationAdaptiveAssessmentRequest $request,
        NextSessionRecommendationService $service,
    ): JsonResponse {
        $recommendation = $this->findOwnedRecommendation($request, (int) $request->validated('recommendation_id'));
        $validated = $request->validated();

        $payload = $service->applyAdaptiveAssessment($request->user(), $recommendation, [
            'result' => $validated['result'],
            'summary' => $validated['summary'] ?? null,
            'assessment_id' => $validated['assessment_id'] ?? null,
            'weak_ayahs' => $validated['weak_ayahs'] ?? [],
            'sequence_errors' => $validated['sequence_errors'] ?? 0,
            'missed_words' => $validated['missed_words'] ?? 0,
            'pronunciation_issues' => (bool) ($validated['pronunciation_issues'] ?? false),
            'reason_codes' => $validated['reason_codes'] ?? [],
            'skills' => $validated['skills'] ?? null,
            'skill_view' => $validated['skill_view'] ?? null,
            'policy' => $validated['policy'] ?? null,
            'responses' => $validated['responses'] ?? null,
            'events' => $validated['events'] ?? null,
            'review' => $validated['review'] ?? null,
            'snapshot' => $validated['snapshot'] ?? null,
            'plan_detail' => $validated['plan_detail'] ?? null,
            'ayah_range' => $validated['ayah_range'] ?? null,
            'focus_ayahs' => $validated['focus_ayahs'] ?? null,
        ]);

        return response()->json([
            'saved' => true,
            'recommendation' => $payload,
        ]);
    }

    private function findOwnedRecommendation(Request $request, int $id): SessionRecommendation
    {
        return SessionRecommendation::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();
    }
}
