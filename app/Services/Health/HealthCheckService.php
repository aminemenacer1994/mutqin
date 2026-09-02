<?php

namespace App\Services\Health;

use App\Support\Monitoring\HealthHeartbeat;
use App\Support\MutqinLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Sentry\SentrySdk;
use Sentry\Severity;
use Sentry\State\Scope;
use Throwable;

class HealthCheckService
{
    public function __construct(
        private readonly HealthHeartbeat $heartbeats,
    ) {}

    /**
     * @return array{status: string, checks: array<string, array<string, mixed>>}
     */
    public function run(bool $detailed = false): array
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'redis' => $this->checkRedis(),
            'scheduler' => $this->checkScheduler(),
            'queue_worker' => $this->checkQueueWorker(),
            'storage' => $this->checkStorage(),
            'speechmatics' => $this->checkSpeechmatics(),
        ];

        $status = $this->aggregate($checks);

        if (! $detailed) {
            return [
                'status' => $status,
                'checks' => [],
            ];
        }

        return [
            'status' => $status,
            'checks' => $checks,
        ];
    }

    /**
     * Public payload — status only.
     *
     * @return array{status: string}
     */
    public function publicPayload(): array
    {
        return ['status' => $this->run(false)['status']];
    }

    /**
     * Emit rate-limited ops signals when health is not ok.
     */
    public function evaluateAndAlert(): array
    {
        $result = $this->run(true);
        $status = $result['status'];

        if ($status === 'ok') {
            Cache::forget('mutqin:monitoring:last_alert_status');

            return $result;
        }

        $cooldown = max(60, (int) config('monitoring.alert_cooldown_seconds', 300));
        $fingerprint = $status.'|'.collect($result['checks'])
            ->map(fn (array $check, string $name) => $name.':'.($check['status'] ?? ''))
            ->implode(',');

        $cacheKey = 'mutqin:monitoring:alert_emitted';
        $previous = Cache::get($cacheKey);
        if (is_array($previous)
            && ($previous['fingerprint'] ?? null) === $fingerprint
            && isset($previous['at'])
            && now()->diffInSeconds(Carbon::parse($previous['at'])) < $cooldown) {
            return $result;
        }

        $safe = [
            'status' => $status,
            'failed' => collect($result['checks'])
                ->filter(fn (array $c) => in_array($c['status'] ?? '', ['fail', 'degraded'], true))
                ->keys()
                ->values()
                ->all(),
        ];

        if ($status === 'unavailable') {
            MutqinLog::error('monitoring.health.unavailable', $safe);
            $this->notifySentry('Mutqin health unavailable', $safe, 'error');
        } else {
            MutqinLog::warning('monitoring.health.degraded', $safe);
            $this->notifySentry('Mutqin health degraded', $safe, 'warning');
        }

        Cache::put($cacheKey, [
            'fingerprint' => $fingerprint,
            'at' => now()->toIso8601String(),
        ], $cooldown);

        return $result;
    }

    /**
     * @param  array<string, array{status: string}>  $checks
     */
    private function aggregate(array $checks): string
    {
        $critical = ['database', 'cache', 'storage'];
        foreach ($critical as $name) {
            if (($checks[$name]['status'] ?? '') === 'fail') {
                return 'unavailable';
            }
        }

        // Redis only critical when actively used as cache/queue/session backend.
        if (($checks['redis']['status'] ?? '') === 'fail'
            && ($checks['redis']['required'] ?? false) === true) {
            return 'unavailable';
        }

        foreach ($checks as $name => $check) {
            $status = $check['status'] ?? '';
            if ($name === 'speechmatics') {
                // Optional AI — never flips overall to unavailable by itself.
                continue;
            }
            if (in_array($status, ['fail', 'degraded'], true)) {
                return 'degraded';
            }
        }

        if (($checks['speechmatics']['status'] ?? '') === 'degraded') {
            return 'degraded';
        }

        return 'ok';
    }

    /**
     * @return array{status: string, code?: string}
     */
    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            DB::select('select 1 as ok');

            return ['status' => 'ok'];
        } catch (Throwable) {
            return ['status' => 'fail', 'code' => 'unreachable'];
        }
    }

    /**
     * @return array{status: string, code?: string}
     */
    private function checkCache(): array
    {
        try {
            $key = 'mutqin:monitoring:cache_probe:'.bin2hex(random_bytes(4));
            $value = 'ok';
            Cache::put($key, $value, 30);
            $read = Cache::get($key);
            Cache::forget($key);

            if ($read !== $value) {
                return ['status' => 'fail', 'code' => 'mismatch'];
            }

            return ['status' => 'ok'];
        } catch (Throwable) {
            return ['status' => 'fail', 'code' => 'unreachable'];
        }
    }

    /**
     * @return array{status: string, required: bool, code?: string}
     */
    private function checkRedis(): array
    {
        $required = $this->redisIsRequired();
        if (! $required) {
            return ['status' => 'skipped', 'required' => false, 'code' => 'not_in_use'];
        }

        try {
            Redis::connection()->ping();

            return ['status' => 'ok', 'required' => true];
        } catch (Throwable) {
            return ['status' => 'fail', 'required' => true, 'code' => 'unreachable'];
        }
    }

    /**
     * @return array{status: string, code?: string, age_seconds?: int|null}
     */
    private function checkScheduler(): array
    {
        $maxAge = (int) config('monitoring.heartbeats.scheduler_max_age_seconds', 180);
        $result = $this->heartbeats->status(HealthHeartbeat::KIND_SCHEDULER, $maxAge);

        if ($result['status'] === 'ok') {
            return [
                'status' => 'ok',
                'age_seconds' => $result['age_seconds'],
            ];
        }

        return [
            'status' => 'fail',
            'code' => $result['at'] === null ? 'missing_heartbeat' : 'stale_heartbeat',
            'age_seconds' => $result['age_seconds'],
        ];
    }

    /**
     * @return array{status: string, code?: string, age_seconds?: int|null}
     */
    private function checkQueueWorker(): array
    {
        $connection = (string) config('queue.default');
        $driver = (string) config("queue.connections.{$connection}.driver", $connection);

        if (in_array($driver, ['sync', 'null', 'deferred'], true)) {
            return ['status' => 'skipped', 'code' => 'sync_driver'];
        }

        $maxAge = (int) config('monitoring.heartbeats.worker_max_age_seconds', 300);
        $result = $this->heartbeats->status(HealthHeartbeat::KIND_WORKER, $maxAge);

        if ($result['status'] === 'ok') {
            return [
                'status' => 'ok',
                'age_seconds' => $result['age_seconds'],
            ];
        }

        return [
            'status' => 'fail',
            'code' => $result['at'] === null ? 'missing_heartbeat' : 'stale_heartbeat',
            'age_seconds' => $result['age_seconds'],
        ];
    }

    /**
     * @return array{status: string, code?: string}
     */
    private function checkStorage(): array
    {
        try {
            $relative = trim((string) config('mutqin.audio_privacy.temp_disk_path', 'tmp/learner-audio'), '/');
            $dir = storage_path('app/'.$relative);
            if (! is_dir($dir) && ! @mkdir($dir, 0755, true) && ! is_dir($dir)) {
                return ['status' => 'fail', 'code' => 'unwritable'];
            }

            $probe = $dir.'/.mutqin-health-'.bin2hex(random_bytes(4));
            if (@file_put_contents($probe, 'ok') === false) {
                return ['status' => 'fail', 'code' => 'unwritable'];
            }
            @unlink($probe);

            // Default local disk used for feedback screenshots etc.
            $disk = Storage::disk((string) config('filesystems.default', 'local'));
            $name = 'mutqin-health-'.bin2hex(random_bytes(4)).'.txt';
            $disk->put($name, 'ok');
            $ok = $disk->get($name) === 'ok';
            $disk->delete($name);

            if (! $ok) {
                return ['status' => 'fail', 'code' => 'mismatch'];
            }

            return ['status' => 'ok'];
        } catch (Throwable) {
            return ['status' => 'fail', 'code' => 'unreachable'];
        }
    }

    /**
     * Config/availability signal only — never calls Speechmatics.
     *
     * @return array{status: string, code?: string}
     */
    private function checkSpeechmatics(): array
    {
        $key = trim((string) config('services.speechmatics.api_key', ''));
        $region = trim((string) config('services.speechmatics.region', ''));

        if ($key === '') {
            return ['status' => 'skipped', 'code' => 'not_configured'];
        }

        if ($region === '') {
            return ['status' => 'degraded', 'code' => 'misconfigured'];
        }

        return ['status' => 'ok', 'code' => 'configured'];
    }

    private function redisIsRequired(): bool
    {
        $drivers = [
            (string) config('cache.stores.'.config('cache.default').'.driver'),
            (string) config('queue.connections.'.config('queue.default').'.driver'),
            (string) config('session.driver'),
        ];

        return in_array('redis', $drivers, true);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function notifySentry(string $message, array $context, string $level): void
    {
        if (! class_exists(SentrySdk::class) || ! function_exists('\\Sentry\\captureMessage')) {
            return;
        }

        $dsn = trim((string) config('sentry.dsn', ''));
        if ($dsn === '' || ! app()->bound('sentry')) {
            return;
        }

        \Sentry\withScope(function (Scope $scope) use ($message, $context, $level): void {
            $scope->setTag('feature', 'monitoring');
            $scope->setTag('probe', 'health');
            $scope->setContext('health', $context);
            \Sentry\captureMessage(
                $message,
                $level === 'error' ? Severity::error() : Severity::warning()
            );
        });
    }
}
