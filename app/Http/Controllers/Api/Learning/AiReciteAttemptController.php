<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StoreAiReciteAttemptAudioRequest;
use App\Models\AiReciteAttempt;
use App\Services\DashboardService;
use App\Services\Learning\AiReciteAttemptAudioService;
use App\Services\Learning\SessionAnalysisQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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

    public function storeAudio(
        StoreAiReciteAttemptAudioRequest $request,
        int $attempt,
        AiReciteAttemptAudioService $audio,
    ): JsonResponse {
        $row = $this->ownedAttempt($request, $attempt);
        if ($row === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $stored = $audio->store(
            $request->user(),
            $row,
            $request->file('audio'),
            $request->integer('duration_ms') ?: null,
        );

        $payload = $audio->payload($row->fresh());
        if (! $stored) {
            $privacyBlocked = \App\Support\AudioPrivacy::rawRecordingRetention()
                === \App\Support\AudioPrivacy::RETENTION_NEVER;
            if ($privacyBlocked) {
                $payload['reason'] = 'privacy_never';
            }

            return response()->json([
                'message' => $privacyBlocked
                    ? 'Audio retention is disabled.'
                    : 'Audio could not be stored.',
                'audio' => $payload,
            ], $privacyBlocked ? 200 : 422);
        }

        return response()->json([
            'audio' => $payload,
        ]);
    }

    public function audio(
        Request $request,
        int $attempt,
        AiReciteAttemptAudioService $audio,
    ): Response {
        $row = $this->ownedAttempt($request, $attempt);
        if ($row === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $response = $audio->stream($request->user(), $row);
        if ($response === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return $response;
    }

    private function ownedAttempt(Request $request, int $attemptId): ?AiReciteAttempt
    {
        return AiReciteAttempt::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($attemptId)
            ->first();
    }
}
