<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin array
 */
class AdminDashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payload = is_array($this->resource) ? $this->resource : [];

        return [
            'meta' => $payload['meta'] ?? [
                'owner_id' => (int) optional($request->user())->id,
                'generated_at' => now()->toIso8601String(),
            ],
            'welcome' => $payload['welcome'] ?? null,
            'snapshot' => $payload['snapshot'] ?? null,
            'learning' => $payload['learning'] ?? null,
            'ai_health' => $payload['ai_health'] ?? null,
            'learners' => $payload['learners'] ?? [],
            'top_learners' => $payload['top_learners'] ?? [],
            'mix' => $payload['mix'] ?? null,
            'chart' => $payload['chart'] ?? null,
            'week_summary' => $payload['week_summary'] ?? null,
            'contacts' => $payload['contacts'] ?? null,
            'activity' => $payload['activity'] ?? [],
        ];
    }
}
