<?php

namespace App\Http\Controllers\Api\Learning;

use App\Http\Controllers\Controller;
use App\Models\HifzPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HifzPlanController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $plan = HifzPlan::query()
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json([
            'plan' => $plan?->config,
            'meta' => $plan ? [
                'id' => $plan->id,
                'client_id' => $plan->client_id,
                'status' => $plan->status,
                'updated_at' => $plan->updated_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => ['required', 'array'],
            'client_id' => ['nullable', 'string', 'max:80'],
        ]);

        $payload = $validated['plan'];
        $status = (string) ($payload['lifecycle']['status'] ?? $payload['status'] ?? 'active');

        $record = HifzPlan::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'client_id' => $validated['client_id'] ?? ($payload['id'] ?? null),
                'status' => $status,
                'config' => $payload,
            ]
        );

        return response()->json([
            'saved' => true,
            'plan' => $record->config,
            'meta' => [
                'id' => $record->id,
                'client_id' => $record->client_id,
                'status' => $record->status,
                'updated_at' => $record->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        HifzPlan::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['deleted' => true]);
    }
}
