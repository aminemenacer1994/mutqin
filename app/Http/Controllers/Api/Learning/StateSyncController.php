<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SyncStateRequest;
use App\Models\MemorisationSyncState;
use App\Services\DashboardService;
use App\Services\LearningStateDeriver;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Support\AudioPrivacy;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Full-fidelity state sync used by the Vue client as the live persistence
 * boundary for authenticated users. Stores the raw engine state blob (so nothing
 * is ever lost) and projects it into the normalised, queryable tables.
 */
class StateSyncController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $record = MemorisationSyncState::query()->firstWhere('user_id', $user->id);

        // Throttle the "last pulled" bookkeeping so a read does not turn into a
        // write on every poll. It only needs to be roughly accurate.
        if ($record && (! $record->last_pulled_at || $record->last_pulled_at->lt(now()->subMinutes(5)))) {
            try {
                $record->forceFill(['last_pulled_at' => now()])->saveQuietly();
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $decoded = null;
        if (is_string($record?->state) && $record->state !== '') {
            $decoded = json_decode($record->state, true);
            if (! is_array($decoded)) {
                $decoded = null;
            }
        }

        return response()->json([
            'state' => $this->slimEngineState($decoded),
            'meta' => [
                'owner_id' => $user->id,
                'state_updated_at' => $record?->state_updated_at?->toIso8601String(),
                'payload_hash' => $record?->payload_hash,
                'has_state' => (bool) $record,
            ],
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    }

    public function store(
        SyncStateRequest $request,
        LearningStateDeriver $deriver,
        LearningHistoryRetentionService $retention
    ): JsonResponse {
        $user = $request->user();
        $validated = $request->validated();

        // Never persist raw learner recordings into sync-state JSON unless retention is "retain".
        $state = is_array($validated['state'] ?? null) ? $validated['state'] : [];
        if (! AudioPrivacy::retainsRawAudio()) {
            $state = $retention->stripRawAudioFromStateTree($state);
        }
        $validated['state'] = $this->slimEngineState($state) ?? [];

        $encodedState = json_encode($validated['state'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encodedState === false) {
            return response()->json(['message' => __('ui.api_sync_encode_failed')], 422);
        }

        $localUpdatedAt = isset($validated['meta']['local_updated_at'])
            ? Carbon::parse($validated['meta']['local_updated_at'])
            : now();

        $payloadHash = hash('sha256', $encodedState);

        $existing = MemorisationSyncState::query()->firstWhere('user_id', $user->id);
        $unchanged = $existing && $existing->payload_hash === $payloadHash;

        // No-op autosaves: skip rewriting the longText blob and re-deriving tables.
        if ($unchanged) {
            return response()->json([
                'saved' => true,
                'unchanged' => true,
                'meta' => [
                    'owner_id' => $user->id,
                    'state_updated_at' => $existing?->state_updated_at?->toIso8601String()
                        ?? $localUpdatedAt->toIso8601String(),
                    'payload_hash' => $payloadHash,
                ],
            ]);
        }

        // Reject strictly older client clocks so a late/stale autosave cannot
        // overwrite newer progress that already landed on the server.
        if (
            $existing
            && $existing->state_updated_at
            && isset($validated['meta']['local_updated_at'])
            && $localUpdatedAt->lt($existing->state_updated_at)
        ) {
            return response()->json([
                'saved' => false,
                'stale' => true,
                'meta' => [
                    'owner_id' => $user->id,
                    'state_updated_at' => $existing->state_updated_at->toIso8601String(),
                    'payload_hash' => $existing->payload_hash,
                ],
            ], 409);
        }

        $syncPayload = [
            'state' => $encodedState,
            'device_id' => $validated['meta']['device_id'] ?? null,
            'device_label' => $validated['meta']['device_label'] ?? null,
            'payload_hash' => $payloadHash,
            'state_updated_at' => $localUpdatedAt,
        ];

        try {
            MemorisationSyncState::updateOrCreate(
                ['user_id' => $user->id],
                $syncPayload
            );
        } catch (UniqueConstraintViolationException) {
            $row = MemorisationSyncState::query()->where('user_id', $user->id)->first();
            if ($row) {
                $row->fill($syncPayload)->save();
            }
        }

        try {
            $deriver->derive($user, $validated['state'], $validated['continue'] ?? null);
        } catch (\Throwable $e) {
            report($e);
        }

        DashboardService::forgetForUser($user);

        return response()->json([
            'saved' => true,
            'meta' => [
                'owner_id' => $user->id,
                'state_updated_at' => $localUpdatedAt->toIso8601String(),
                'payload_hash' => $payloadHash,
            ],
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    }

    /**
     * @param  array<string, mixed>|null  $state
     * @return array<string, mixed>|null
     */
    private function slimEngineState(?array $state): ?array
    {
        if ($state === null) {
            return null;
        }

        $sessionState = $state['sessionState'] ?? null;
        if (! is_array($sessionState)) {
            return $state;
        }

        if (isset($sessionState['queue']) && is_array($sessionState['queue'])) {
            $sessionState['queue'] = array_map(
                fn ($item) => $this->slimEngineQueueItem($item),
                $sessionState['queue']
            );
        }

        if (isset($sessionState['config']) && is_array($sessionState['config'])) {
            unset($sessionState['config']['verses'], $sessionState['config']['queue']);
        }

        $state['sessionState'] = $sessionState;

        return $state;
    }

    private function slimEngineQueueItem(mixed $item): mixed
    {
        if (! is_array($item)) {
            return $item;
        }

        $ayahId = $item['ayahId'] ?? ($item['verse']['key'] ?? ($item['key'] ?? null));

        return [
            'phase' => $item['phase'] ?? null,
            'ayahId' => $ayahId,
            'chainKey' => $item['chainKey'] ?? null,
            'sequencePosition' => $item['sequencePosition'] ?? null,
            'sequenceTotal' => $item['sequenceTotal'] ?? null,
            'repeatCount' => $item['repeatCount'] ?? null,
            'totalRepeats' => $item['totalRepeats'] ?? null,
            'prompt' => $item['prompt'] ?? '',
            'segment' => $item['segment'] ?? null,
            'plannerType' => $item['plannerType'] ?? null,
            'chainStage' => $item['chainStage'] ?? null,
        ];
    }
}
