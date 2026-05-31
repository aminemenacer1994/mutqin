<?php

namespace App\Http\Controllers;

use App\Models\MemorisationSyncState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MemorisationSyncController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $record = MemorisationSyncState::query()->firstWhere('user_id', $user->id);

        if ($record) {
            $record->forceFill([
                'last_pulled_at' => now(),
            ])->save();
        }

        return response()->json([
            'state' => $record ? json_decode($record->state, true) : null,
            'meta' => [
                'owner_id' => $user->id,
                'owner_email' => $user->email,
                'state_updated_at' => $record?->state_updated_at?->toIso8601String(),
                'device_id' => $record?->device_id,
                'device_label' => $record?->device_label,
                'payload_hash' => $record?->payload_hash,
                'last_pulled_at' => $record?->last_pulled_at?->toIso8601String(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'state' => ['required', 'array'],
            'meta' => ['nullable', 'array'],
            'meta.device_id' => ['nullable', 'string', 'max:120'],
            'meta.device_label' => ['nullable', 'string', 'max:255'],
            'meta.local_updated_at' => ['nullable', 'date'],
        ]);

        $encodedState = json_encode($validated['state'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encodedState === false) {
            return response()->json([
                'message' => 'Unable to encode sync state.',
            ], 422);
        }

        $localUpdatedAt = isset($validated['meta']['local_updated_at'])
            ? Carbon::parse($validated['meta']['local_updated_at'])
            : now();

        $record = MemorisationSyncState::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'state' => $encodedState,
                'device_id' => $validated['meta']['device_id'] ?? null,
                'device_label' => $validated['meta']['device_label'] ?? null,
                'payload_hash' => hash('sha256', $encodedState),
                'state_updated_at' => $localUpdatedAt,
            ]
        );

        return response()->json([
            'saved' => true,
            'meta' => [
                'owner_id' => $user->id,
                'owner_email' => $user->email,
                'state_updated_at' => $record->state_updated_at?->toIso8601String(),
                'payload_hash' => $record->payload_hash,
                'device_id' => $record->device_id,
                'device_label' => $record->device_label,
            ],
        ]);
    }
}
