<?php

namespace App\Services;

use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Daily Speechmatics cost guard for realtime token mints.
 *
 * Counts successful token mints (each mint is a short-lived RT session) per
 * UTC day. This is intentionally not a billing system: no invoices, no
 * per-second metering, no Stripe coupling.
 */
class SpeechmaticsUsageCap
{
    public const LEARNER_MESSAGE = 'You have reached today\'s AI voice-check limit. Please try again tomorrow.';

    public const REASON = 'usage_cap';

    private const CACHE_PREFIX = 'mutqin:speechmatics:usage';

    public function __construct(
        private CacheRepository $cache,
    ) {}

    /**
     * @return array{
     *     allowed: bool,
     *     reason: string|null,
     *     scope: string|null,
     *     used: int,
     *     limit: int|null
     * }
     */
    public function inspect(?int $userId): array
    {
        if (! $this->isEnabled()) {
            return $this->allow();
        }

        $limits = $this->resolvedLimits();
        if ($limits['user'] === null && $limits['global'] === null) {
            $this->logMisconfigOnce('enabled_without_valid_limits', [
                'detail' => 'Usage cap is on but no positive daily limit is configured; allowing mints.',
            ]);

            return $this->allow();
        }

        $date = $this->usageDate();

        if ($userId && $limits['user'] !== null) {
            $used = $this->currentCount($this->userKey($userId, $date));
            if ($used >= $limits['user']) {
                $this->logHit('user', $userId, $used, $limits['user'], $date);

                return $this->deny('user', $used, $limits['user']);
            }
        }

        if ($limits['global'] !== null) {
            $used = $this->currentCount($this->globalKey($date));
            if ($used >= $limits['global']) {
                $this->logHit('global', $userId, $used, $limits['global'], $date);

                return $this->deny('global', $used, $limits['global']);
            }
        }

        return $this->allow();
    }

    public function recordSuccessfulMint(?int $userId): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $limits = $this->resolvedLimits();
        if ($limits['user'] === null && $limits['global'] === null) {
            return;
        }

        $date = $this->usageDate();
        $ttl = $this->cacheTtl();

        if ($userId) {
            $used = $this->increment($this->userKey($userId, $date), $ttl);
            $this->logThresholdIfNeeded('user', $userId, $used, $limits['user'], $date, $ttl);
        }

        $globalUsed = $this->increment($this->globalKey($date), $ttl);
        $this->logThresholdIfNeeded('global', $userId, $globalUsed, $limits['global'], $date, $ttl);
    }

    /**
     * @return array{user: int|null, global: int|null}
     */
    public function resolvedLimits(): array
    {
        return [
            'user' => $this->resolveScopeLimit('user'),
            'global' => $this->resolveScopeLimit('global'),
        ];
    }

    public function isEnabled(): bool
    {
        $value = config('services.speechmatics.usage_cap.enabled', true);

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value === 1;
        }

        $normalized = strtolower(trim((string) $value));
        if (in_array($normalized, ['1', 'true', 'on', 'yes'], true)) {
            return true;
        }

        if (in_array($normalized, ['0', 'false', 'off', 'no', ''], true)) {
            return false;
        }

        $this->logMisconfigOnce('enabled', [
            'value' => $normalized,
            'detail' => 'Unrecognised SPEECHMATICS_USAGE_CAP_ENABLED value; treating as disabled.',
        ]);

        return false;
    }

    public function tokenTtlSeconds(): int
    {
        $ttl = $this->parsePositiveInt(config('services.speechmatics.token_ttl', 120), logInvalid: false);

        return $ttl ?? 120;
    }

    /**
     * @return array{allowed: true, reason: null, scope: null, used: int, limit: null}
     */
    private function allow(): array
    {
        return [
            'allowed' => true,
            'reason' => null,
            'scope' => null,
            'used' => 0,
            'limit' => null,
        ];
    }

    /**
     * @return array{allowed: false, reason: string, scope: string, used: int, limit: int}
     */
    private function deny(string $scope, int $used, int $limit): array
    {
        return [
            'allowed' => false,
            'reason' => self::REASON,
            'scope' => $scope,
            'used' => $used,
            'limit' => $limit,
        ];
    }

    private function resolveScopeLimit(string $scope): ?int
    {
        $mintsKey = $scope === 'user'
            ? 'services.speechmatics.usage_cap.daily_user_token_mints'
            : 'services.speechmatics.usage_cap.daily_global_token_mints';
        $minutesKey = $scope === 'user'
            ? 'services.speechmatics.usage_cap.daily_user_session_minutes'
            : 'services.speechmatics.usage_cap.daily_global_session_minutes';

        $fromMints = $this->parsePositiveInt(config($mintsKey));
        $fromMinutes = $this->minutesToMints(config($minutesKey));

        if ($fromMints === null) {
            return $fromMinutes;
        }

        if ($fromMinutes === null) {
            return $fromMints;
        }

        return min($fromMints, $fromMinutes);
    }

    private function minutesToMints(mixed $value): ?int
    {
        $minutes = $this->parsePositiveInt($value);
        if ($minutes === null) {
            return null;
        }

        return max(1, (int) ceil(($minutes * 60) / $this->tokenTtlSeconds()));
    }

    private function parsePositiveInt(mixed $value, bool $logInvalid = true): ?int
    {
        if ($value === null || $value === '' || $value === false) {
            return null;
        }

        if (is_bool($value)) {
            if ($logInvalid) {
                $this->logMisconfigOnce('non_numeric_limit', ['value' => $value]);
            }

            return null;
        }

        if (is_string($value)) {
            $value = trim($value);
            if ($value === '') {
                return null;
            }
        }

        if (! is_numeric($value)) {
            if ($logInvalid) {
                $this->logMisconfigOnce('non_numeric_limit', ['value' => $value]);
            }

            return null;
        }

        $int = (int) $value;
        if ($int < 0 && $logInvalid) {
            $this->logMisconfigOnce('negative_limit', ['value' => $value]);
        }

        return $int > 0 ? $int : null;
    }

    private function usageDate(): string
    {
        return Carbon::now('UTC')->toDateString();
    }

    private function cacheTtl(): Carbon
    {
        return Carbon::now('UTC')->endOfDay()->addHour();
    }

    private function userKey(int $userId, string $date): string
    {
        return self::CACHE_PREFIX.':user:'.$userId.':'.$date;
    }

    private function globalKey(string $date): string
    {
        return self::CACHE_PREFIX.':global:'.$date;
    }

    private function currentCount(string $key): int
    {
        return max(0, (int) $this->cache->get($key, 0));
    }

    private function increment(string $key, Carbon $ttl): int
    {
        $this->cache->add($key, 0, $ttl);

        return max(0, (int) $this->cache->increment($key));
    }

    private function logThresholdIfNeeded(string $scope, ?int $userId, int $used, ?int $limit, string $date, Carbon $ttl): void
    {
        if ($limit === null || $limit <= 0) {
            return;
        }

        if ($used >= $limit) {
            $this->logHit($scope, $userId, $used, $limit, $date);

            return;
        }

        $remaining = $limit - $used;
        $warnRemaining = max(1, (int) ceil($limit * 0.2));
        if ($remaining > $warnRemaining) {
            return;
        }

        $flagKey = self::CACHE_PREFIX.':warned:'.$scope.':'.($userId ?: 'all').':'.$date;
        if (! $this->cache->add($flagKey, 1, $ttl)) {
            return;
        }

        Log::warning('Speechmatics usage cap approaching.', [
            'scope' => $scope,
            'user_id' => $userId,
            'used' => $used,
            'limit' => $limit,
            'remaining' => $remaining,
            'date' => $date,
        ]);
    }

    private function logHit(string $scope, ?int $userId, int $used, int $limit, string $date): void
    {
        Log::warning('Speechmatics usage cap reached.', [
            'scope' => $scope,
            'user_id' => $userId,
            'used' => $used,
            'limit' => $limit,
            'date' => $date,
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function logMisconfigOnce(string $kind, array $context): void
    {
        $flagKey = self::CACHE_PREFIX.':misconfig:'.$kind.':'.$this->usageDate();
        if (! $this->cache->add($flagKey, 1, $this->cacheTtl())) {
            return;
        }

        Log::warning('Speechmatics usage cap misconfigured.', [
            'kind' => $kind,
            ...$context,
        ]);
    }
}
