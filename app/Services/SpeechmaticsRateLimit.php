<?php

namespace App\Services;

use App\Models\User;
use App\Support\MutqinLog;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Burst / per-minute guard for Speechmatics realtime token mints.
 *
 * Complements {@see SpeechmaticsUsageCap} (daily cost). This limiter always
 * counts every mint attempt — including upstream failures — so retries cannot
 * bypass spend protection by failing on purpose.
 */
class SpeechmaticsRateLimit
{
    public const NAME = 'speechmatics-token';

    public const REASON = 'rate_limit';

    public const LEARNER_MESSAGE = 'You are starting AI voice checks too quickly. Please wait a moment and try again.';

    public const DEFAULT_PER_USER_PER_MINUTE = 10;

    public const DEFAULT_PER_IP_PER_MINUTE = 30;

    public const DEFAULT_BURST_PER_USER = 3;

    public const DEFAULT_BURST_SECONDS = 10;

    /**
     * Named RateLimiter callback: per-user + per-IP (+ optional short burst).
     *
     * @return array<int, Limit>|Limit
     */
    public function limitsFor(Request $request): array|Limit
    {
        if (! $this->isEnabled()) {
            return Limit::none();
        }

        if ($this->shouldBypass($request->user())) {
            return Limit::none();
        }

        $response = fn (Request $req, array $headers): Response => $this->tooManyAttemptsResponse($req, $headers);

        $limits = [];

        $user = $request->user();
        $userId = $user instanceof User ? (int) $user->id : null;
        $configured = $this->configuredLimits();

        if ($userId !== null) {
            // Short window: stops double-submit / soft-recover storms from minting many RT keys.
            $limits[] = Limit::perSecond($configured['burst_per_user'], $configured['burst_seconds'])
                ->by($this->key('burst', 'user', (string) $userId))
                ->response($response);

            $limits[] = Limit::perMinute($configured['per_user_per_minute'])
                ->by($this->key('minute', 'user', (string) $userId))
                ->response($response);
        }

        // IP safeguard for shared sessions, stolen cookies, and any future guest path.
        $ip = (string) ($request->ip() ?: 'unknown');
        $limits[] = Limit::perMinute($configured['per_ip_per_minute'])
            ->by($this->key('minute', 'ip', $this->fingerprintIp($ip)))
            ->response($response);

        return $limits;
    }

    /**
     * @return array{
     *     per_user_per_minute: int,
     *     per_ip_per_minute: int,
     *     burst_per_user: int,
     *     burst_seconds: int
     * }
     */
    public function configuredLimits(): array
    {
        return [
            'per_user_per_minute' => $this->positiveInt(
                config('services.speechmatics.rate_limit.per_user_per_minute'),
                self::DEFAULT_PER_USER_PER_MINUTE
            ),
            'per_ip_per_minute' => $this->positiveInt(
                config('services.speechmatics.rate_limit.per_ip_per_minute'),
                self::DEFAULT_PER_IP_PER_MINUTE
            ),
            'burst_per_user' => $this->positiveInt(
                config('services.speechmatics.rate_limit.burst_per_user'),
                self::DEFAULT_BURST_PER_USER
            ),
            'burst_seconds' => $this->positiveInt(
                config('services.speechmatics.rate_limit.burst_seconds'),
                self::DEFAULT_BURST_SECONDS
            ),
        ];
    }

    /**
     * Serialize overlapping mints per user so a double-submit / in-flight retry
     * cannot open a second Speechmatics HTTP call. Sequential callers after the
     * lock is released always mint again (legitimate AMD recover / next attempt).
     *
     * @template T
     *
     * @param  callable(): T  $mint
     * @return T|JsonResponse
     */
    public function runExclusiveMint(?int $userId, callable $mint): mixed
    {
        if ($userId === null || $userId < 1) {
            return $mint();
        }

        $lock = Cache::lock($this->key('inflight', 'user', (string) $userId), 20);

        if (! $lock->get()) {
            $resultKey = $this->key('inflight-result', 'user', (string) $userId);
            $shared = Cache::get($resultKey);
            if ($this->isShareableTokenPayload($shared)) {
                return response()->json($shared);
            }

            try {
                $lock->block(12);
            } catch (Throwable) {
                // Lock timeout: fall through and look for a shared success payload.
            }

            $shared = Cache::get($resultKey);
            try {
                $lock->release();
            } catch (Throwable) {
                // Lock may already have been released by the owner.
            }

            if ($this->isShareableTokenPayload($shared)) {
                return response()->json($shared);
            }

            return $mint();
        }

        try {
            $result = $mint();
            $payload = $result instanceof JsonResponse ? $result->getData(true) : null;
            if ($this->isShareableTokenPayload($payload)) {
                Cache::put($this->key('inflight-result', 'user', (string) $userId), $payload, 5);
            }

            return $result;
        } finally {
            $lock->release();
        }
    }

    /**
     * @param  array<string, string>  $headers
     */
    public function tooManyAttemptsResponse(Request $request, array $headers): Response
    {
        $retryAfter = $this->retryAfterSeconds($headers);
        $this->logHit($request, $retryAfter, $headers);

        $payload = [
            'available' => false,
            'reason' => self::REASON,
            'message' => self::LEARNER_MESSAGE,
            'retry_after' => $retryAfter,
        ];

        return response()->json($payload, 429, $headers);
    }

    public function isEnabled(): bool
    {
        $value = config('services.speechmatics.rate_limit.enabled', true);

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value === 1;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'on', 'yes'], true);
    }

    public function shouldBypass(?User $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        if (filter_var(config('services.speechmatics.rate_limit.bypass_admin', false), FILTER_VALIDATE_BOOL)
            && $user->isAdmin()) {
            return true;
        }

        if (filter_var(config('services.speechmatics.rate_limit.bypass_demo', false), FILTER_VALIDATE_BOOL)
            && $this->isDemoMailbox($user)) {
            return true;
        }

        return false;
    }

    private function isDemoMailbox(User $user): bool
    {
        $email = strtolower(trim((string) $user->email));

        return $email !== '' && str_ends_with($email, '@mutqin.test');
    }

    private function key(string $window, string $scope, string $id): string
    {
        return self::NAME.':'.$window.':'.$scope.':'.$id;
    }

    /**
     * Stable non-reversible IP fingerprint for limiter keys / logs (no raw IP in logs).
     */
    private function fingerprintIp(string $ip): string
    {
        return hash('sha256', $ip.'|'.(string) config('app.key'));
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function retryAfterSeconds(array $headers): int
    {
        $raw = $headers['Retry-After'] ?? $headers['retry-after'] ?? null;
        $seconds = is_numeric($raw) ? (int) $raw : 0;

        return max(1, $seconds);
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function logHit(Request $request, int $retryAfter, array $headers): void
    {
        $user = $request->user();
        $userId = $user instanceof User ? (int) $user->id : null;
        $ip = (string) ($request->ip() ?: '');
        $configured = $this->configuredLimits();

        $context = [
            'reason' => self::REASON,
            'user_id' => $userId,
            'ip_fingerprint' => $ip !== '' ? substr($this->fingerprintIp($ip), 0, 16) : null,
            'retry_after' => $retryAfter,
            'limit' => isset($headers['X-RateLimit-Limit']) ? (int) $headers['X-RateLimit-Limit'] : null,
            'remaining' => isset($headers['X-RateLimit-Remaining']) ? (int) $headers['X-RateLimit-Remaining'] : null,
            'path' => '/memorisation/transcription-token',
            'is_admin' => $user instanceof User ? $user->isAdmin() : false,
            'is_demo' => $user instanceof User ? $this->isDemoMailbox($user) : false,
            'limits' => $configured,
        ];

        MutqinLog::warning('speechmatics.rate_limit.hit', $context);
        // Legacy log line for existing alert rules / README references.
        Log::warning('Speechmatics token rate limit hit.', $context);
    }

    private function isShareableTokenPayload(mixed $payload): bool
    {
        return is_array($payload)
            && isset($payload['access_token'], $payload['websocket_host'])
            && is_string($payload['access_token'])
            && $payload['access_token'] !== ''
            && is_string($payload['websocket_host'])
            && $payload['websocket_host'] !== '';
    }

    private function positiveInt(mixed $value, int $fallback): int
    {
        if ($value === null || $value === '' || $value === false) {
            return $fallback;
        }

        if (! is_numeric($value)) {
            return $fallback;
        }

        $int = (int) $value;

        return $int > 0 ? $int : $fallback;
    }
}
