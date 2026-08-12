<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SyncStateRequest;
use App\Models\MemorisationSyncState;
use App\Services\DashboardService;
use App\Services\LearningStateDeriver;
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
            'state' => $decoded,
            'meta' => [
                'owner_id' => $user->id,
                'state_updated_at' => $record?->state_updated_at?->toIso8601String(),
                'payload_hash' => $record?->payload_hash,
                'has_state' => (bool) $record,
            ],
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    }

    public function store(SyncStateRequest $request, LearningStateDeriver $deriver): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $encodedState = json_encode($validated['state'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encodedState === false) {
            return response()->json(['message' => 'Unable to encode sync state.'], 422);
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
}
