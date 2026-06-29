<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\MigrateLocalStorageRequest;
use App\Models\MemorisationSyncState;
use App\Services\LearningStateDeriver;
use Illuminate\Http\JsonResponse;

/**
 * One-time migration of legacy localStorage learning data into the backend.
 *
 * Only imports when the backend has no existing state for the user, so it can be
 * retried safely and will never clobber server-side data that already exists
 * (e.g. data created on another device).
 */
class MigrateLocalStorageController extends Controller
{
    public function store(MigrateLocalStorageRequest $request, LearningStateDeriver $deriver): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $existing = MemorisationSyncState::query()->firstWhere('user_id', $user->id);

        // Backend already has data (e.g. another device migrated first): do not
        // overwrite it. Report success so the client can clear its legacy keys.
        if ($existing) {
            return response()->json([
                'migrated' => false,
                'reason' => 'backend_already_populated',
                'already_migrated' => true,
            ]);
        }

        $encodedState = json_encode($validated['state'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encodedState === false) {
            return response()->json(['message' => 'Unable to encode migration payload.'], 422);
        }

        MemorisationSyncState::create([
            'user_id' => $user->id,
            'state' => $encodedState,
            'device_id' => $validated['meta']['device_id'] ?? null,
            'device_label' => $validated['meta']['device_label'] ?? null,
            'payload_hash' => hash('sha256', $encodedState),
            'state_updated_at' => now(),
        ]);

        $deriver->derive($user, $validated['state'], $validated['continue'] ?? null);

        return response()->json([
            'migrated' => true,
            'already_migrated' => false,
        ]);
    }
}
