<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

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

        $burstMax = $this->positiveInt(config('services.speechmatics.rate_limit.burst_per_user'), 3);
        $burstSeconds = $this->positiveInt(config('services.speechmatics.rate_limit.burst_seconds'), 10);
        $perUser = $this->positiveInt(config('services.speechmatics.rate_limit.per_user_per_minute'), 10);
        $perIp = $this->positiveInt(config('services.speechmatics.rate_limit.per_ip_per_minute'), 30);

        if ($userId !== null) {
            // Short window: stops double-submit / soft-recover storms from minting many RT keys.
            $limits[] = Limit::perSecond($burstMax, $burstSeconds)
                ->by($this->key('burst', 'user', (string) $userId))
                ->response($response);

            $limits[] = Limit::perMinute($perUser)
                ->by($this->key('minute', 'user', (string) $userId))
                ->response($response);
        }

        // IP safeguard for shared sessions, stolen cookies, and any future guest path.
        $ip = (string) ($request->ip() ?: 'unknown');
        $limits[] = Limit::perMinute($perIp)
            ->by($this->key('minute', 'ip', $this->fingerprintIp($ip)))
            ->response($response);

        return $limits;
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

        Log::warning('Speechmatics token rate limit hit.', [
            'reason' => self::REASON,
            'user_id' => $userId,
            'ip_fingerprint' => $ip !== '' ? substr($this->fingerprintIp($ip), 0, 16) : null,
            'retry_after' => $retryAfter,
            'limit' => isset($headers['X-RateLimit-Limit']) ? (int) $headers['X-RateLimit-Limit'] : null,
            'remaining' => isset($headers['X-RateLimit-Remaining']) ? (int) $headers['X-RateLimit-Remaining'] : null,
            'path' => '/memorisation/transcription-token',
            'is_admin' => $user instanceof User ? $user->isAdmin() : false,
        ]);
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
