<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SaveContinueRequest;
use App\Models\UserLastPosition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContinueController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $position = UserLastPosition::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($position) {
            $this->authorize('view', $position);
        }

        return response()->json(['position' => $position]);
    }

    public function store(SaveContinueRequest $request): JsonResponse
    {
        $data = $request->validated();

        $position = UserLastPosition::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'surah_number' => $data['surah_number'] ?? null,
                'ayah_number' => $data['ayah_number'] ?? null,
                'last_step' => $data['last_step'] ?? 0,
                'metadata' => $data['metadata'] ?? null,
                'last_opened_at' => $data['last_opened_at'] ?? now(),
            ]
        );

        $this->authorize('update', $position);

        return response()->json(['saved' => true, 'position' => $position]);
    }
}
