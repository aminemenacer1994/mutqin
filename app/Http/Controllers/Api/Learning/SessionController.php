<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveSessionRequest;
use App\Models\UserSession;
use App\Services\NextSessionRecommendationService;
use App\Services\SessionLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function __construct(private readonly SessionLifecycleService $lifecycle)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $session = UserSession::query()
            ->where('user_id', $request->user()->id)
            ->latest('last_activity_at')
            ->latest('id')
            ->first();

        if ($session) {
            $this->authorize('view', $session);
        }

        return response()->json([
            'session' => $session,
            'unfinished' => $session && $this->lifecycle->isUnfinished($session),
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $session = $this->lifecycle->currentUnfinished($request->user());
        if ($session) {
            $this->authorize('view', $session);
        }

        return response()->json([
            'session' => $session,
            'unfinished' => (bool) $session,
        ]);
    }

    public function store(SaveSessionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $action = $data['action'] ?? 'save';

        $session = match ($action) {
            'start' => $this->lifecycle->start($request->user(), $data),
            'pause' => $this->lifecycle->pause($request->user(), $data),
            'resume' => $this->lifecycle->resume($request->user(), $data),
            'end' => $this->lifecycle->end($request->user(), $data),
            'discard_example' => $this->lifecycle->discardOnboardingExample($request->user()),
            default => $this->saveProgress($request->user(), $data),
        };

        if ($session) {
            $this->authorize('update', $session);
        }

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => $session ? $this->lifecycle->isUnfinished($session) : false,
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'current_step' => ['nullable', 'integer', 'min:0'],
            'memorisation_mode' => ['nullable', 'string', 'max:32'],
            'repetitions_completed' => ['nullable', 'integer', 'min:0'],
            'session_duration_seconds' => ['nullable', 'integer', 'min:0'],
            'last_activity_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $session = $this->lifecycle->start($request->user(), $data);
        $this->authorize('update', $session);

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => true,
        ]);
    }

    public function pause(Request $request): JsonResponse
    {
        $data = $request->validate([
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'current_step' => ['nullable', 'integer', 'min:0'],
            'memorisation_mode' => ['nullable', 'string', 'max:32'],
            'repetitions_completed' => ['nullable', 'integer', 'min:0'],
            'session_duration_seconds' => ['nullable', 'integer', 'min:0'],
            'last_activity_at' => ['nullable', 'date'],
            'paused_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $session = $this->lifecycle->pause($request->user(), $data);
        $this->authorize('update', $session);

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => true,
        ]);
    }

    public function resume(Request $request): JsonResponse
    {
        $data = $request->validate([
            'surah_number' => ['nullable', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'current_step' => ['nullable', 'integer', 'min:0'],
            'memorisation_mode' => ['nullable', 'string', 'max:32'],
            'last_activity_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $session = $this->lifecycle->resume($request->user(), $data);
        $this->authorize('update', $session);

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => true,
        ]);
    }

    public function end(Request $request, NextSessionRecommendationService $recommendations): JsonResponse
    {
        $data = $request->validate([
            'session_duration_seconds' => ['nullable', 'integer', 'min:0'],
            'last_activity_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'completion_settings' => ['nullable', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $session = $this->lifecycle->end($request->user(), $data);
        $this->authorize('update', $session);

        $recommendation = null;
        $recommendationError = false;
        try {
            $recommendation = $recommendations->recommendForCompletedSession($request->user(), $session);
        } catch (\Throwable) {
            $recommendationError = true;
        }

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => false,
            'recommendation' => $recommendation,
            'recommendation_error' => $recommendationError && ! $recommendation,
        ]);
    }

    /**
     * Mid-session progress save — updates the unfinished session only.
     * Never mutates a completed historical record.
     *
     * @param  array<string, mixed>  $data
     */
    private function saveProgress(\App\Models\User $user, array $data): UserSession
    {
        $unfinished = $this->lifecycle->currentUnfinished($user);
        if ($unfinished) {
            // Never collapse an unfinished row into status "none" via mid-session sync.
            if (($data['status'] ?? null) === \App\Enums\UserSessionStatus::None->value) {
                unset($data['status']);
            }

            $unfinished->fill(array_filter([
                'surah_number' => $data['surah_number'] ?? null,
                'ayah_number' => $data['ayah_number'] ?? null,
                'current_step' => $data['current_step'] ?? null,
                'memorisation_mode' => $data['memorisation_mode'] ?? null,
                'status' => $data['status'] ?? null,
                'repetitions_completed' => $data['repetitions_completed'] ?? null,
                'session_duration_seconds' => $data['session_duration_seconds'] ?? null,
                'last_activity_at' => $data['last_activity_at'] ?? now(),
                'paused_at' => $data['paused_at'] ?? null,
                'resumed_at' => $data['resumed_at'] ?? null,
                'metadata' => $data['metadata'] ?? null,
            ], static fn ($value) => $value !== null));
            $unfinished->save();

            return $unfinished->fresh();
        }

        return $this->lifecycle->start($user, $data);
    }
}
