<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveSessionRequest;
use App\Models\UserSession;
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
            'resume' => $this->lifecycle->resume($request->user(), $data),
            'end' => $this->lifecycle->end($request->user(), $data),
            'discard_example' => $this->lifecycle->discardOnboardingExample($request->user()),
            default => UserSession::updateOrCreate(
                ['user_id' => $request->user()->id],
                array_filter([
                    'surah_number' => $data['surah_number'] ?? null,
                    'ayah_number' => $data['ayah_number'] ?? null,
                    'current_step' => $data['current_step'] ?? 0,
                    'memorisation_mode' => $data['memorisation_mode'] ?? null,
                    'status' => $data['status'] ?? null,
                    'is_onboarding_example' => array_key_exists('is_onboarding_example', $data)
                        ? (bool) $data['is_onboarding_example']
                        : null,
                    'repetitions_completed' => $data['repetitions_completed'] ?? 0,
                    'session_duration_seconds' => $data['session_duration_seconds'] ?? 0,
                    'last_activity_at' => $data['last_activity_at'] ?? now(),
                    'started_at' => $data['started_at'] ?? null,
                    'paused_at' => $data['paused_at'] ?? null,
                    'resumed_at' => $data['resumed_at'] ?? null,
                    'ended_at' => $data['ended_at'] ?? null,
                    'metadata' => $data['metadata'] ?? null,
                ], static fn ($value) => $value !== null)
            ),
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

    public function end(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_duration_seconds' => ['nullable', 'integer', 'min:0'],
            'last_activity_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $session = $this->lifecycle->end($request->user(), $data);
        $this->authorize('update', $session);

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => false,
        ]);
    }
}
