<?php

namespace App\Support\Monitoring;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class HealthHeartbeat
{
    public const KIND_SCHEDULER = 'scheduler';

    public const KIND_WORKER = 'worker';

    public function touch(string $kind): void
    {
        $key = $this->key($kind);
        if ($key === null) {
            return;
        }

        $this->store()->forever($key, [
            'at' => now()->utc()->toIso8601String(),
            'kind' => $kind,
        ]);
    }

    /**
     * @return array{status: string, age_seconds: int|null, at: string|null}
     */
    public function status(string $kind, int $maxAgeSeconds): array
    {
        $key = $this->key($kind);
        if ($key === null) {
            return [
                'status' => 'skipped',
                'age_seconds' => null,
                'at' => null,
            ];
        }

        $payload = $this->store()->get($key);
        if (! is_array($payload) || empty($payload['at']) || ! is_string($payload['at'])) {
            return [
                'status' => 'fail',
                'age_seconds' => null,
                'at' => null,
            ];
        }

        try {
            $at = Carbon::parse($payload['at'])->utc();
        } catch (\Throwable) {
            return [
                'status' => 'fail',
                'age_seconds' => null,
                'at' => null,
            ];
        }

        $age = max(0, $at->diffInSeconds(now()->utc()));

        return [
            'status' => $age <= $maxAgeSeconds ? 'ok' : 'fail',
            'age_seconds' => $age,
            'at' => $at->toIso8601String(),
        ];
    }

    private function key(string $kind): ?string
    {
        return match ($kind) {
            self::KIND_SCHEDULER => (string) config('monitoring.heartbeats.scheduler_key'),
            self::KIND_WORKER => (string) config('monitoring.heartbeats.worker_key'),
            default => null,
        };
    }

    private function store()
    {
        $name = config('monitoring.heartbeats.cache_store');

        return $name ? Cache::store($name) : Cache::store();
    }
}
