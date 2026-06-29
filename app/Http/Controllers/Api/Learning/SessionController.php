<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveSessionRequest;
use App\Models\UserSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
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

        return response()->json(['session' => $session]);
    }

    public function store(SaveSessionRequest $request): JsonResponse
    {
        $data = $request->validated();

        $session = UserSession::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'surah_number' => $data['surah_number'] ?? null,
                'ayah_number' => $data['ayah_number'] ?? null,
                'current_step' => $data['current_step'] ?? 0,
                'memorisation_mode' => $data['memorisation_mode'] ?? null,
                'repetitions_completed' => $data['repetitions_completed'] ?? 0,
                'session_duration_seconds' => $data['session_duration_seconds'] ?? 0,
                'last_activity_at' => $data['last_activity_at'] ?? now(),
                'metadata' => $data['metadata'] ?? null,
            ]
        );

        $this->authorize('update', $session);

        return response()->json(['saved' => true, 'session' => $session]);
    }
}
