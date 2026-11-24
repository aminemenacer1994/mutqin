<?php

namespace App\Services\Billing;

use App\Models\User;
use App\Services\UserAiReciteUsageService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Single place for Free / Premium / Premium Plus access and daily quotas.
 */
class SubscriptionEntitlement
{
    public const AI_ASSESSMENT = 'ai_assessment';

    public const MUSHAF = 'mushaf';

    public const MEMORISATION = 'memorisation';

    public const REVISION = 'revision';

    public const BASIC_PROGRESS = 'basic_progress';

    public const PREMIUM_TOOLS = 'premium_tools';

    public const PRO_TOOLS = 'pro_tools';

    public const WORD_BY_WORD = 'word_by_word';

    public const OFFLINE_AUDIO = 'offline_audio';

    public const WEAK_AYAH_INSIGHTS = 'weak_ayah_insights';

    public const FIND_AYAH = 'find_ayah';

    public function __construct(private readonly UserAiReciteUsageService $usage) {}

    public function getEffectivePlan(User $user): string
    {
        return $user->effectiveSubscriptionTier();
    }

    public function canAccessFeature(User $user, string $feature): bool
    {
        return match ($feature) {
            self::MUSHAF, self::MEMORISATION, self::REVISION, self::BASIC_PROGRESS => true,
            self::AI_ASSESSMENT => $this->canStartAiAssessment($user),
            self::PREMIUM_TOOLS,
            self::WORD_BY_WORD,
            self::WEAK_AYAH_INSIGHTS => $user->hasPremiumAccess(),
            self::PRO_TOOLS, self::OFFLINE_AUDIO => $user->hasProAccess(),
            self::FIND_AYAH => $this->canStartFindAyah($user),
            default => false,
        };
    }

    public function canStartFindAyah(User $user): bool
    {
        if ($user->hasProAccess()) {
            return true;
        }

        if (! $user->hasPremiumAccess()) {
            return false;
        }

        $limit = $this->findAyahDailyLimit($user);

        return $limit === null || $this->findAyahUsedToday($user) < $limit;
    }

    public function freeSavedSessionsLimit(): int
    {
        return max(0, (int) config('billing.limits.free.saved_sessions', 5));
    }

    public function savedSessionsLimit(User $user): ?int
    {
        if ($user->hasProAccess()) {
            return null;
        }

        if ($user->hasPremiumAccess()) {
            return max(0, (int) config('billing.limits.premium.saved_sessions', 10));
        }

        return $this->freeSavedSessionsLimit();
    }

    public function canStartAiAssessment(User $user): bool
    {
        return true;
    }

    /**
     * @return array{limit: int|null, used: int, remaining: int|null, resets_at: string, allowed: bool, reason: string|null}
     */
    public function getRemainingUsage(User $user, string $feature): array
    {
        if ($feature === self::FIND_AYAH) {
            $limit = $user->hasProAccess() ? null : ($user->hasPremiumAccess() ? $this->findAyahDailyLimit($user) : 0);
            $used = $user->hasPremiumAccess() ? $this->findAyahUsedToday($user) : 0;
            $remaining = $limit === null ? null : max(0, $limit - $used);

            return [
                'limit' => $limit,
                'used' => $used,
                'remaining' => $remaining,
                'resets_at' => $this->resetsAt()->toIso8601String(),
                'allowed' => $this->canStartFindAyah($user),
                'reason' => ($remaining === 0 && $limit !== null) ? UserAiReciteUsageService::REASON_DAILY : null,
            ];
        }

        if ($feature !== self::AI_ASSESSMENT) {
            return [
                'limit' => null,
                'used' => 0,
                'remaining' => null,
                'resets_at' => $this->resetsAt()->toIso8601String(),
                'allowed' => $this->canAccessFeature($user, $feature),
                'reason' => null,
            ];
        }

        $snapshot = $this->usage->inspect($user);

        return [
            'limit' => $snapshot['daily_limit'],
            'used' => $snapshot['daily_used'],
            'remaining' => $snapshot['daily_remaining'],
            'resets_at' => $this->resetsAt()->toIso8601String(),
            'allowed' => $snapshot['allowed'] && $this->canStartAiAssessment($user),
            'reason' => $snapshot['reason'],
        ];
    }

    public function checkAndConsumeUsage(User $user, string $feature): bool
    {
        if ($feature === self::FIND_AYAH) {
            if ($user->hasProAccess()) {
                return true;
            }

            if (! $user->hasPremiumAccess()) {
                return false;
            }

            $limit = $this->findAyahDailyLimit($user);
            if ($limit === null) {
                return true;
            }

            return $this->incrementDaily($user, self::FIND_AYAH, $limit);
        }

        if ($feature !== self::AI_ASSESSMENT) {
            return $this->canAccessFeature($user, $feature);
        }

        if (! $this->canStartAiAssessment($user)) {
            return false;
        }

        $snapshot = $this->usage->inspect($user);
        if (! $snapshot['allowed']) {
            return false;
        }

        if (! ($snapshot['within_normal_limits'] ?? false)) {
            return $this->usage->consumeBonusCheck($user);
        }

        $limit = $snapshot['daily_limit'];
        if ($limit === null) {
            return true;
        }

        if ($snapshot['daily_used'] >= $limit) {
            return $this->usage->consumeBonusCheck($user);
        }

        return $this->incrementDaily($user, $feature, $limit);
    }

    public function consumeFindAyah(User $user): bool
    {
        return $this->checkAndConsumeUsage($user, self::FIND_AYAH);
    }

    public function consumeAiAssessment(User $user): bool
    {
        return $this->checkAndConsumeUsage($user, self::AI_ASSESSMENT);
    }

    public function resetsAt(): Carbon
    {
        return Carbon::now('UTC')->addDay()->startOfDay();
    }

    /**
     * @return array<string, mixed>
     */
    public function quotaPayload(User $user): array
    {
        $usage = $this->getRemainingUsage($user, self::AI_ASSESSMENT);
        $reason = $usage['reason'] ?: UserAiReciteUsageService::REASON_DAILY;

        return [
            'message' => $this->usage->learnerMessageForReason($reason),
            'reason' => $reason,
            'upgrade' => $reason === UserAiReciteUsageService::REASON_DAILY && ! $user->hasProAccess(),
            'remaining' => $usage['remaining'],
            'limit' => $usage['limit'],
            'resets_at' => $usage['resets_at'],
            'pricing_url' => route('pricing'),
        ];
    }

    private function findAyahDailyLimit(User $user): ?int
    {
        if ($user->hasProAccess()) {
            return null;
        }

        if ($user->hasPremiumAccess()) {
            $value = (int) config('billing.limits.premium.find_ayah_per_day', 10);

            return $value > 0 ? $value : null;
        }

        return 0;
    }

    private function findAyahUsedToday(User $user): int
    {
        $period = Carbon::now('UTC')->toDateString();

        return (int) (DB::table('feature_usage_counters')
            ->where('user_id', $user->id)
            ->where('feature', self::FIND_AYAH)
            ->where('period_on', $period)
            ->value('consumed') ?? 0);
    }

    private function incrementDaily(User $user, string $feature, int $limit): bool
    {
        $period = Carbon::now('UTC')->toDateString();
        $now = now();

        DB::table('feature_usage_counters')->insertOrIgnore([
            'user_id' => $user->id,
            'feature' => $feature,
            'period_on' => $period,
            'consumed' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $updated = DB::update(
            'update feature_usage_counters set consumed = consumed + 1, updated_at = ? where user_id = ? and feature = ? and period_on = ? and consumed < ?',
            [$now, $user->id, $feature, $period, $limit]
        );

        return $updated === 1;
    }
}