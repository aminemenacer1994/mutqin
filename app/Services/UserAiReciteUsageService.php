<?php

namespace App\Services;

use App\Models\FeatureUsageCounter;
use App\Models\MemorisationAssessment;
use App\Models\User;
use App\Services\Billing\SubscriptionEntitlement;
use Illuminate\Support\Carbon;

/**
 * AI voice-check usage: only completed, persisted, valid scored checks count.
 */
class UserAiReciteUsageService
{
    public const REASON = 'lifetime_limit';

    public const REASON_DAILY = 'daily_limit';

    public const LEARNER_MESSAGE = 'You have reached your AI voice-check limit. Contact support if you need more checks.';

    public const LEARNER_DAILY_MESSAGE = 'You have reached today\'s free AI recitation assessment limit. Please try again tomorrow.';

    public function lifetimeCheckCount(User $user): int
    {
        return (int) MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->validScored()
            ->count();
    }

    public function dailyCheckCount(User $user, ?Carbon $day = null): int
    {
        $period = ($day ?? Carbon::now('UTC'))->copy()->utc()->toDateString();
        $consumed = FeatureUsageCounter::query()
            ->where('user_id', $user->id)
            ->where('feature', SubscriptionEntitlement::AI_ASSESSMENT)
            ->whereDate('period_on', $period)
            ->value('consumed');

        if ($consumed !== null) {
            return (int) $consumed;
        }

        return $this->storedDailyAssessmentCount($user, $day);
    }

    /**
     * Completed scored checks for the UTC day. Failures and retries that did
     * not create a new scored row are not included.
     */
    public function storedDailyAssessmentCount(User $user, ?Carbon $day = null): int
    {
        $day = ($day ?? Carbon::now('UTC'))->copy()->utc()->startOfDay();
        $end = $day->copy()->endOfDay();

        return (int) MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->validScored()
            ->whereBetween('created_at', [$day, $end])
            ->count();
    }

    public function isDailyLimitExempt(User $user): bool
    {
        $email = strtolower(trim((string) $user->email));
        $exemptEmails = config('mutqin.ai_recite.daily_limit_exempt_emails', []);
        if ($email !== '' && in_array($email, $exemptEmails, true)) {
            return true;
        }

        $normalizedName = strtolower(preg_replace('/\s+/', ' ', trim((string) $user->name)) ?? '');
        if ($normalizedName === '') {
            return false;
        }

        $exemptNames = config('mutqin.ai_recite.daily_limit_exempt_names', []);

        return in_array($normalizedName, $exemptNames, true);
    }

    public function resolvedLifetimeLimit(User $user): ?int
    {
        if ($user->ai_recite_lifetime_limit !== null) {
            $value = (int) $user->ai_recite_lifetime_limit;

            return $value > 0 ? $value : null;
        }

        $default = config('mutqin.ai_recite.default_lifetime_limit');

        if ($default === null || $default === '') {
            return null;
        }

        $value = (int) $default;

        return $value > 0 ? $value : null;
    }

    public function resolvedDailyLimit(User $user): ?int
    {
        if ($this->isDailyLimitExempt($user) || $user->hasProAccess()) {
            return null;
        }

        $default = config('billing.limits.free.ai_assessments_per_day');
        if ($default === null || $default === '') {
            $default = config('mutqin.ai_recite.default_daily_limit', 5);
        }

        $value = (int) $default;

        return $value > 0 ? $value : null;
    }

    public function learnerMessageForReason(?string $reason): string
    {
        return match ($reason) {
            self::REASON_DAILY => __('billing.daily_limit', [
                'limit' => (int) config('billing.limits.free.ai_assessments_per_day', 5),
            ]),
            default => self::LEARNER_MESSAGE,
        };
    }

    /**
     * @return array{
     *     used: int,
     *     limit: int|null,
     *     remaining: int|null,
     *     daily_used: int,
     *     daily_limit: int|null,
     *     daily_remaining: int|null,
     *     allowed: bool,
     *     reason: string|null
     * }
     */
    public function inspect(User $user): array
    {
        $used = $this->lifetimeCheckCount($user);
        $limit = $this->resolvedLifetimeLimit($user);
        $lifetimeAllowed = $limit === null || $used < $limit;
        $remaining = $limit === null ? null : max(0, $limit - $used);

        $dailyUsed = $this->dailyCheckCount($user);
        $dailyLimit = $this->resolvedDailyLimit($user);
        $dailyAllowed = $dailyLimit === null || $dailyUsed < $dailyLimit;
        $dailyRemaining = $dailyLimit === null ? null : max(0, $dailyLimit - $dailyUsed);

        $reason = null;
        if (! $lifetimeAllowed) {
            $reason = self::REASON;
        } elseif (! $dailyAllowed) {
            $reason = self::REASON_DAILY;
        }

        return [
            'used' => $used,
            'limit' => $limit,
            'remaining' => $remaining,
            'daily_used' => $dailyUsed,
            'daily_limit' => $dailyLimit,
            'daily_remaining' => $dailyRemaining,
            'allowed' => $lifetimeAllowed && $dailyAllowed,
            'reason' => $reason,
        ];
    }

    public function wouldAllowAnotherCheck(User $user): bool
    {
        return $this->inspect($user)['allowed'];
    }
}
