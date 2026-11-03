<?php

namespace App\Services;

use App\Models\MemorisationAssessment;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * AI voice-check usage (MemorisationAssessment rows): daily platform cap + optional lifetime admin limits.
 */
class UserAiReciteUsageService
{
    public const REASON = 'lifetime_limit';

    public const REASON_DAILY = 'daily_limit';

    public const LEARNER_MESSAGE = 'You have reached your AI voice-check limit. Contact support if you need more checks.';

    public const LEARNER_DAILY_MESSAGE = 'You have reached today\'s limit of 10 AI recite checks. Please try again tomorrow.';

    public function lifetimeCheckCount(User $user): int
    {
        return (int) MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->count();
    }

    public function dailyCheckCount(User $user, ?Carbon $day = null): int
    {
        $day = ($day ?? Carbon::now('UTC'))->copy()->startOfDay();
        $end = $day->copy()->endOfDay();

        return (int) MemorisationAssessment::query()
            ->where('user_id', $user->id)
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
        if ($this->isDailyLimitExempt($user)) {
            return null;
        }

        $default = (int) config('mutqin.ai_recite.default_daily_limit', 10);

        return $default > 0 ? $default : null;
    }

    public function learnerMessageForReason(?string $reason): string
    {
        return match ($reason) {
            self::REASON_DAILY => self::LEARNER_DAILY_MESSAGE,
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
