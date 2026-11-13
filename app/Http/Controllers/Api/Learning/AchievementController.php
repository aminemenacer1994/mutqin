<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Services\Achievements\AchievementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    public function __construct(private readonly AchievementService $achievements) {}

    public function index(Request $request): JsonResponse
    {
        $payload = $this->achievements->fullPayload($request->user());

        return response()->json($payload);
    }

    public function acknowledge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'achievement_ids' => ['required', 'array', 'min:1', 'max:20'],
            'achievement_ids.*' => ['required', 'string', 'max:64'],
        ]);

        $items = $this->achievements->acknowledge(
            $request->user(),
            $data['achievement_ids']
        );

        return response()->json(['items' => $items]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'timezone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'weekly_practice_days_goal' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:7'],
        ]);

        $settings = $this->achievements->updateSettings($request->user(), $data);

        return response()->json(['settings' => $settings]);
    }
}
