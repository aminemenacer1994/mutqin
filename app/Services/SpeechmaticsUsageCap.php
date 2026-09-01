<?php

namespace App\Services;

use App\Support\MutqinLog;
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
    public const LEARNER_USER_MESSAGE = 'You have reached today\'s AI voice-check limit. Please try again tomorrow.';

    public const LEARNER_GLOBAL_MESSAGE = 'AI voice checking is temporarily unavailable due to high demand. Please try again later.';

    /** @deprecated Use {@see LEARNER_USER_MESSAGE} or {@see LEARNER_GLOBAL_MESSAGE} */
    public const LEARNER_MESSAGE = self::LEARNER_USER_MESSAGE;

    public const LEARNER_UNAVAILABLE = 'Voice checking could not start right now. Please try again later.';

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
        if ($limits['user'] === null && $limits['global'] === null && $limits['emergency'] === null) {
            $failClosed = $this->failsClosedOnMisconfig();
            $this->logMisconfigOnce('enabled_without_valid_limits', [
                'detail' => $failClosed
                    ? 'Usage cap is on but no positive daily limit is configured; denying mints.'
                    : 'Usage cap is on but no positive daily limit is configured; allowing mints.',
            ]);

            return $failClosed
                ? $this->deny('misconfig', 0, 0)
                : $this->allow();
        }

        $this->logProviderReferenceMisconfigIfNeeded($limits['global']);

        $date = $this->usageDate();

        if ($userId && $limits['user'] !== null) {
            $used = $this->currentCount($this->userKey($userId, $date));
            if ($used >= $limits['user']) {
                $this->logHit('user', $userId, $used, $limits['user'], $date);

                return $this->deny('user', $used, $limits['user']);
            }
        }

        if ($limits['emergency'] !== null) {
            $used = $this->currentCount($this->globalKey($date));
            if ($used >= $limits['emergency']) {
                $this->logHit('emergency', $userId, $used, $limits['emergency'], $date);

                return $this->deny('emergency', $used, $limits['emergency']);
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

    public function learnerMessageForScope(?string $scope): string
    {
        return match ($scope) {
            'user' => self::LEARNER_USER_MESSAGE,
            'global', 'emergency', 'misconfig' => self::LEARNER_GLOBAL_MESSAGE,
            default => self::LEARNER_USER_MESSAGE,
        };
    }

    public function recordSuccessfulMint(?int $userId): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $limits = $this->resolvedLimits();
        if ($limits['user'] === null && $limits['global'] === null && $limits['emergency'] === null) {
            return;
        }

        $date = $this->usageDate();
        $ttl = $this->cacheTtl();
        $userUsed = null;
        $globalUsed = null;

        if ($userId) {
            $userUsed = $this->increment($this->userKey($userId, $date), $ttl);
            $this->evaluateThresholds('user', $userId, $userUsed, $limits['user'], $date, $ttl);
        }

        $globalUsed = $this->increment($this->globalKey($date), $ttl);
        $this->evaluateThresholds('global', $userId, $globalUsed, $limits['global'], $date, $ttl);
        $this->evaluateThresholds('emergency', $userId, $globalUsed, $limits['emergency'], $date, $ttl);

        $providerReference = $this->providerReferenceMints();
        if ($providerReference !== null) {
            $this->evaluateThresholds('provider_reference', $userId, $globalUsed, $providerReference, $date, $ttl);
        }

        $this->logMintMetrics($userId, $userUsed, $globalUsed, $limits, $date);
    }

    /**
     * @return array{
     *     date: string,
     *     user: array{used: int|null, limit: int|null, estimated_session_minutes: float|null},
     *     global: array{used: int, limit: int|null, emergency_limit: int|null, estimated_session_minutes: float},
     *     provider_reference: array{limit: int|null, estimated_session_minutes: float|null, headroom_mints: int|null},
     *     token_ttl_seconds: int
     * }
     */
    public function usageSnapshot(?int $userId = null): array
    {
        $date = $this->usageDate();
        $limits = $this->resolvedLimits();
        $globalUsed = $this->currentCount($this->globalKey($date));
        $userUsed = $userId ? $this->currentCount($this->userKey($userId, $date)) : null;
        $providerReference = $this->providerReferenceMints();
        $ttl = $this->tokenTtlSeconds();

        return [
            'date' => $date,
            'user' => [
                'used' => $userUsed,
                'limit' => $limits['user'],
                'estimated_session_minutes' => $userUsed !== null
                    ? $this->mintsToSessionMinutes($userUsed, $ttl)
                    : null,
            ],
            'global' => [
                'used' => $globalUsed,
                'limit' => $limits['global'],
                'emergency_limit' => $limits['emergency'],
                'estimated_session_minutes' => $this->mintsToSessionMinutes($globalUsed, $ttl),
            ],
            'provider_reference' => [
                'limit' => $providerReference,
                'estimated_session_minutes' => $providerReference !== null
                    ? $this->mintsToSessionMinutes($providerReference, $ttl)
                    : null,
                'headroom_mints' => $providerReference !== null
                    ? max(0, $providerReference - $globalUsed)
                    : null,
            ],
            'token_ttl_seconds' => $ttl,
        ];
    }

    /**
     * @return array{user: int|null, global: int|null, emergency: int|null}
     */
    public function resolvedLimits(): array
    {
        $global = $this->resolveScopeLimit('global');
        $emergency = $this->resolveEmergencyLimit($global);

        return [
            'user' => $this->resolveScopeLimit('user'),
            'global' => $global,
            'emergency' => $emergency,
        ];
    }

    public function providerReferenceMints(): ?int
    {
        $fromMints = $this->parsePositiveInt(config('services.speechmatics.provider.reference_daily_token_mints'));
        $fromMinutes = $this->minutesToMints(config('services.speechmatics.provider.reference_daily_session_minutes'));

        if ($fromMints === null) {
            return $fromMinutes;
        }

        if ($fromMinutes === null) {
            return $fromMints;
        }

        return min($fromMints, $fromMinutes);
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

        $failClosed = $this->failsClosedOnMisconfig();
        $this->logMisconfigOnce('enabled', [
            'value' => $normalized,
            'detail' => $failClosed
                ? 'Unrecognised SPEECHMATICS_USAGE_CAP_ENABLED value; treating as enabled.'
                : 'Unrecognised SPEECHMATICS_USAGE_CAP_ENABLED value; treating as disabled.',
        ]);

        return $failClosed;
    }

    public function failsClosedOnMisconfig(): bool
    {
        return ! app()->environment(['local', 'testing']);
    }

    public function tokenTtlSeconds(): int
    {
        $ttl = $this->parsePositiveInt(config('services.speechmatics.token_ttl', 120), logInvalid: false);

        return $ttl ?? 120;
    }

    public function warnPercent(): int
    {
        return $this->clampPercent(config('services.speechmatics.usage_cap.warn_percent', 80), 80);
    }

    public function criticalPercent(): int
    {
        $critical = $this->clampPercent(config('services.speechmatics.usage_cap.critical_percent', 95), 95);

        return max($this->warnPercent(), $critical);
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

    private function resolveEmergencyLimit(?int $globalLimit): ?int
    {
        $fromMints = $this->parsePositiveInt(config('services.speechmatics.usage_cap.emergency_global_token_mints'));
        $fromMinutes = $this->minutesToMints(config('services.speechmatics.usage_cap.emergency_global_session_minutes'));

        $emergency = $fromMints;
        if ($fromMinutes !== null) {
            $emergency = $emergency === null ? $fromMinutes : min($emergency, $fromMinutes);
        }

        if ($emergency === null) {
            return null;
        }

        if ($globalLimit !== null && $emergency >= $globalLimit) {
            $this->logMisconfigOnce('emergency_not_stricter_than_global', [
                'emergency_limit_mints' => $emergency,
                'global_limit_mints' => $globalLimit,
                'detail' => 'Emergency cap must be lower than the daily global cap to act as a kill-switch.',
            ]);

            return null;
        }

        return $emergency;
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

    private function mintsToSessionMinutes(int $mints, int $ttlSeconds): float
    {
        return round(($mints * $ttlSeconds) / 60, 1);
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

    private function evaluateThresholds(
        string $scope,
        ?int $userId,
        int $used,
        ?int $limit,
        string $date,
        Carbon $ttl,
    ): void {
        if ($limit === null || $limit <= 0) {
            return;
        }

        if ($used >= $limit) {
            $this->logHit($scope, $userId, $used, $limit, $date);

            return;
        }

        $usagePercent = (int) floor(($used / $limit) * 100);
        $criticalPercent = $this->criticalPercent();
        $warnPercent = $this->warnPercent();

        if ($usagePercent >= $criticalPercent) {
            $this->logThresholdOnce('critical', $scope, $userId, $used, $limit, $usagePercent, $date, $ttl);

            return;
        }

        if ($usagePercent >= $warnPercent) {
            $this->logThresholdOnce('warning', $scope, $userId, $used, $limit, $usagePercent, $date, $ttl);
        }
    }

    private function logThresholdOnce(
        string $level,
        string $scope,
        ?int $userId,
        int $used,
        int $limit,
        int $usagePercent,
        string $date,
        Carbon $ttl,
    ): void {
        $flagKey = self::CACHE_PREFIX.':threshold:'.$level.':'.$scope.':'.($userId ?: 'all').':'.$date;
        if (! $this->cache->add($flagKey, 1, $ttl)) {
            return;
        }

        $remaining = max(0, $limit - $used);
        $context = [
            'scope' => $scope,
            'user_id' => $userId,
            'used' => $used,
            'limit' => $limit,
            'remaining' => $remaining,
            'usage_percent' => $usagePercent,
            'warn_percent' => $this->warnPercent(),
            'critical_percent' => $this->criticalPercent(),
            'date' => $date,
            'estimated_session_minutes_used' => $this->mintsToSessionMinutes($used, $this->tokenTtlSeconds()),
            'estimated_session_minutes_limit' => $this->mintsToSessionMinutes($limit, $this->tokenTtlSeconds()),
        ];

        $event = $level === 'critical'
            ? 'speechmatics.usage.threshold.critical'
            : 'speechmatics.usage.threshold.warning';

        if ($level === 'critical') {
            MutqinLog::warning($event, $context);
        } else {
            MutqinLog::info($event, $context);
        }

        // Legacy log lines for existing alert rules / README references.
        Log::warning('Speechmatics usage cap approaching.', $context);
    }

    private function logHit(string $scope, ?int $userId, int $used, int $limit, string $date): void
    {
        $context = [
            'scope' => $scope,
            'user_id' => $userId,
            'used' => $used,
            'limit' => $limit,
            'date' => $date,
            'usage_percent' => $limit > 0 ? (int) floor(($used / $limit) * 100) : null,
        ];

        MutqinLog::warning('speechmatics.usage.cap.reached', $context);
        Log::warning('Speechmatics usage cap reached.', $context);
    }

    /**
     * @param  array{user: int|null, global: int|null, emergency: int|null}  $limits
     */
    private function logMintMetrics(?int $userId, ?int $userUsed, ?int $globalUsed, array $limits, string $date): void
    {
        if ($globalUsed === null) {
            return;
        }

        $ttl = $this->tokenTtlSeconds();
        MutqinLog::info('speechmatics.usage.mint_recorded', [
            'user_id' => $userId,
            'date' => $date,
            'user_mints_today' => $userUsed,
            'global_mints_today' => $globalUsed,
            'user_limit_mints' => $limits['user'],
            'global_limit_mints' => $limits['global'],
            'emergency_limit_mints' => $limits['emergency'],
            'provider_reference_mints' => $this->providerReferenceMints(),
            'estimated_user_session_minutes' => $userUsed !== null
                ? $this->mintsToSessionMinutes($userUsed, $ttl)
                : null,
            'estimated_global_session_minutes' => $this->mintsToSessionMinutes($globalUsed, $ttl),
            'token_ttl_seconds' => $ttl,
        ]);
    }

    private function logProviderReferenceMisconfigIfNeeded(?int $globalLimit): void
    {
        $providerReference = $this->providerReferenceMints();
        if ($providerReference === null || $globalLimit === null) {
            return;
        }

        if ($globalLimit <= $providerReference) {
            return;
        }

        $this->logMisconfigOnce('app_cap_exceeds_provider_reference', [
            'application_global_limit_mints' => $globalLimit,
            'provider_reference_mints' => $providerReference,
            'detail' => 'Application global cap exceeds SPEECHMATICS_PROVIDER_* reference; raise provider cap in Speechmatics portal or lower app limits.',
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

        MutqinLog::warning('speechmatics.usage.misconfigured', [
            'kind' => $kind,
            ...$context,
        ]);
        Log::warning('Speechmatics usage cap misconfigured.', [
            'kind' => $kind,
            ...$context,
        ]);
    }

    private function clampPercent(mixed $value, int $fallback): int
    {
        if (! is_numeric($value)) {
            return $fallback;
        }

        $percent = (int) $value;

        return max(1, min(100, $percent));
    }
}
