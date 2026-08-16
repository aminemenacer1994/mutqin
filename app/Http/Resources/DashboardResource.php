<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes the DashboardService payload for API consumers.
 *
 * @mixin array
 */
class DashboardResource extends JsonResource
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
            'continue' => $payload['continue'] ?? null,
            'recommended_next' => $payload['recommended_next'] ?? null,
            'journey' => $payload['journey'] ?? null,
            'snapshot' => $payload['snapshot'] ?? null,
            'progress' => $payload['progress'] ?? null,
            'chart' => $payload['chart'] ?? null,
            'week_summary' => $payload['week_summary'] ?? null,
            'weaknesses' => $payload['weaknesses'] ?? null,
            'activity' => $payload['activity'] ?? [],
            'retention' => $payload['retention'] ?? null,
        ];
    }
}
