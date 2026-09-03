<?php

namespace App\Http\Controllers\Api\Learning;

use App\Enums\UserSessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveSessionRequest;
use App\Models\UserSession;
use App\Services\DashboardService;
use App\Services\MainMemorisationPositionService;
use App\Services\NextSessionRecommendationService;
use App\Services\SessionLifecycleService;
use App\Support\QuranMetadata;
use App\Support\MutqinLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function __construct(private readonly SessionLifecycleService $lifecycle)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $requestedId = (int) $request->query('id', 0);
        if ($requestedId > 0) {
            $session = UserSession::query()
                ->where('user_id', $request->user()->id)
                ->where('id', $requestedId)
                ->first();

            if ($session) {
                $this->authorize('view', $session);
            }

            return response()->json([
                'session' => $session,
                'unfinished' => $session ? $this->lifecycle->isUnfinished($session) : false,
                'found' => (bool) $session,
            ]);
        }

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
            'found' => (bool) $session,
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $requestedId = (int) $request->query('id', $request->query('session_id', 0));
        $session = $requestedId > 0
            ? $this->lifecycle->findOwnedUnfinished($request->user(), $requestedId)
            : $this->lifecycle->currentUnfinished($request->user());

        if ($session) {
            $this->authorize('view', $session);
        }

        return response()->json([
            'session' => $session,
            'unfinished' => (bool) $session,
            'requested_id' => $requestedId > 0 ? $requestedId : null,
            'invalid_requested' => $requestedId > 0 && ! $session,
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $sessions = UserSession::query()
            ->where('user_id', $request->user()->id)
            ->where('is_onboarding_example', false)
            ->whereIn('status', [
                UserSessionStatus::Completed->value,
                UserSessionStatus::EndedEarly->value,
            ])
            ->orderByDesc('ended_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $items = $sessions->map(function (UserSession $session) {
            $meta = is_array($session->metadata) ? $session->metadata : [];
            $config = is_array($meta['config'] ?? null) ? $meta['config'] : [];
            $surah = (int) ($session->surah_number ?: ($config['chapterId'] ?? 0));
            $from = (int) ($config['rangeStart'] ?? 0);
            $to = (int) ($config['rangeEnd'] ?? $from);
            $status = $session->status instanceof UserSessionStatus
                ? $session->status->value
                : (string) $session->status;

            return [
                'id' => $session->id,
                'surah_number' => $surah,
                'surah_name' => $surah > 0 ? (QuranMetadata::name($surah) ?: ('Surah '.$surah)) : null,
                'ayah_start' => $from > 0 ? $from : null,
                'ayah_end' => $to > 0 ? $to : null,
                'status' => $status,
                'occurred_at' => optional($session->ended_at ?? $session->last_activity_at)->toIso8601String(),
            ];
        })->values();

        return response()->json(['sessions' => $items]);
    }

    public function store(SaveSessionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $action = $data['action'] ?? 'save';

        // Mid-session checkpoint: never creates sessions and may reject stale writes.
        if ($action === 'save' || ! in_array($action, ['start', 'pause', 'resume', 'end', 'discard_example'], true)) {
            $result = $this->saveProgress($request->user(), $data);
            $session = $result['session'] ?? null;
            if ($session) {
                $this->authorize('update', $session);
            }

            return response()->json([
                'saved' => (bool) ($result['saved'] ?? false),
                'stale' => (bool) ($result['stale'] ?? false),
                'conflict' => (bool) ($result['conflict'] ?? false),
                'session' => $session,
                'unfinished' => $session ? $this->lifecycle->isUnfinished($session) : false,
            ], (int) ($result['status'] ?? 200));
        }

        $session = match ($action) {
            'start' => $this->lifecycle->start($request->user(), $data),
            'pause' => $this->lifecycle->pause($request->user(), $data),
            'resume' => $this->lifecycle->resume($request->user(), $data),
            'end' => $this->lifecycle->end($request->user(), $data),
            'discard_example' => $this->lifecycle->discardOnboardingExample($request->user()),
        };

        if ($session) {
            $this->authorize('update', $session);
        }

        if (in_array($action, ['start', 'end'], true)) {
            MutqinLog::fromRequest($request, 'learning.session.' . $action, [
                'session_id' => $session?->id,
                'action' => $action,
            ]);
        }

        if (in_array($action, ['start', 'pause', 'resume', 'end', 'discard_example'], true)) {
            DashboardService::forgetForUser($request->user());
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
        MutqinLog::fromRequest($request, 'learning.session.started', [
            'session_id' => $session->id,
            'surah_number' => $session->surah_number,
        ]);
        app(MainMemorisationPositionService::class)->syncFromSessionPayload($request->user(), $session, $data);
        DashboardService::forgetForUser($request->user());

        $unfinished = $this->lifecycle->isUnfinished($session);

        return response()->json([
            'saved' => true,
            'session' => $session,
            'unfinished' => $unfinished,
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
            'session_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $session = $this->lifecycle->pause($request->user(), $data);
        if (! $session) {
            return response()->json([
                'saved' => true,
                'session' => null,
                'unfinished' => false,
                'already_idle' => true,
            ]);
        }

        $this->authorize('update', $session);
        DashboardService::forgetForUser($request->user());

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
            'session_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $session = $this->lifecycle->resume($request->user(), $data);
        $this->authorize('update', $session);
        DashboardService::forgetForUser($request->user());

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
            'range_complete' => ['nullable', 'boolean'],
            'ayah_number' => ['nullable', 'integer', 'min:1', 'max:300'],
            'session_id' => ['nullable', 'integer', 'min:1'],
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

        DashboardService::forgetForUser($request->user());

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
     * Never mutates a completed historical record and never creates a new session
     * (autosave / crash recovery must not spawn duplicates).
     *
     * @param  array<string, mixed>  $data
     * @return array{saved: bool, stale: bool, conflict: bool, session: ?UserSession, status: int}
     */
    private function saveProgress(\App\Models\User $user, array $data): array
    {
        $requestedId = isset($data['session_id']) ? (int) $data['session_id'] : 0;
        $unfinished = $requestedId > 0
            ? $this->lifecycle->findOwnedUnfinished($user, $requestedId)
            : $this->lifecycle->currentUnfinished($user);

        if ($requestedId > 0 && ! $unfinished) {
            return [
                'saved' => false,
                'stale' => false,
                'conflict' => true,
                'session' => null,
                'status' => 409,
            ];
        }

        if (! $unfinished) {
            return [
                'saved' => false,
                'stale' => false,
                'conflict' => false,
                'session' => null,
                'status' => 200,
            ];
        }

        $existingMeta = is_array($unfinished->metadata) ? $unfinished->metadata : [];
        $storedRevision = (int) ($existingMeta['client_revision'] ?? 0);
        $incomingRevision = array_key_exists('client_revision', $data) && $data['client_revision'] !== null
            ? (int) $data['client_revision']
            : null;

        if ($incomingRevision !== null && $storedRevision > 0 && $incomingRevision < $storedRevision) {
            return [
                'saved' => false,
                'stale' => true,
                'conflict' => false,
                'session' => $unfinished,
                'status' => 409,
            ];
        }

        if (! empty($data['last_activity_at']) && $unfinished->last_activity_at) {
            try {
                $incomingActivity = \Illuminate\Support\Carbon::parse($data['last_activity_at']);
                if ($incomingActivity->lt($unfinished->last_activity_at)
                    && ($incomingRevision === null || $incomingRevision <= $storedRevision)
                ) {
                    return [
                        'saved' => false,
                        'stale' => true,
                        'conflict' => false,
                        'session' => $unfinished,
                        'status' => 409,
                    ];
                }
            } catch (\Throwable) {
                // Ignore unparseable client timestamps; revision check above still applies.
            }
        }

        // Never collapse an unfinished row into status "none" via mid-session sync.
        if (($data['status'] ?? null) === UserSessionStatus::None->value) {
            unset($data['status']);
        }
        // Terminal statuses must go through end() — never via mid-session save.
        $terminal = [
            UserSessionStatus::Completed->value,
            UserSessionStatus::EndedEarly->value,
            UserSessionStatus::Abandoned->value,
        ];
        if (isset($data['status']) && in_array((string) $data['status'], $terminal, true)) {
            unset($data['status']);
        }

        $meta = null;
        if (isset($data['metadata']) && is_array($data['metadata'])) {
            $meta = $this->lifecycle->slimMetadata(array_merge($existingMeta, $data['metadata']));
            if ($incomingRevision !== null) {
                $meta['client_revision'] = $incomingRevision;
            } elseif ($storedRevision > 0) {
                $meta['client_revision'] = $storedRevision;
            }
            $meta['last_saved_at'] = now()->toIso8601String();
            $meta['completed'] = false;
            $meta['completed_at'] = null;
        } elseif ($incomingRevision !== null) {
            $meta = array_merge($existingMeta, [
                'client_revision' => $incomingRevision,
                'last_saved_at' => now()->toIso8601String(),
            ]);
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
            'metadata' => $meta,
        ], static fn ($value) => $value !== null));
        $unfinished->save();

        return [
            'saved' => true,
            'stale' => false,
            'conflict' => false,
            'session' => $unfinished->fresh(),
            'status' => 200,
        ];
    }
}
