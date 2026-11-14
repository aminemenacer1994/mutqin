<?php

namespace App\Services\Billing;

use App\Models\User;
use App\Services\UserAiReciteUsageService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Single place for Free / Pro / legacy Premium access and daily AI usage.
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
            self::PREMIUM_TOOLS => $user->hasPremiumAccess(),
            self::PRO_TOOLS, self::WORD_BY_WORD, self::OFFLINE_AUDIO, self::WEAK_AYAH_INSIGHTS, self::FIND_AYAH => $user->hasProAccess(),
            default => false,
        };
    }

    /**
     * Find an Ayah (Ask Mutqin voice) is a Premium feature.
     */
    public function canStartFindAyah(User $user): bool
    {
        return $user->hasProAccess();
    }

    public function freeSavedSessionsLimit(): int
    {
        return max(0, (int) config('billing.limits.free.saved_sessions', 5));
    }

    /**
     * Free learners may start an assessment until the daily allowance is spent.
     * Paid Premium rows are treated as Pro.
     */
    public function canStartAiAssessment(User $user): bool
    {
        return true;
    }

    /**
     * @return array{limit: int|null, used: int, remaining: int|null, resets_at: string, allowed: bool, reason: string|null}
     */
    public function getRemainingUsage(User $user, string $feature): array
    {
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

    /**
     * Reserve one successful AI assessment. Unlimited plans do not increment.
     * The conditional update is atomic, so concurrent requests cannot pass the cap.
     * Call this inside the assessment transaction so a failed save releases the slot.
     * Referral bonus checks cover lifetime or daily overages without creating a new cap.
     */
    public function checkAndConsumeUsage(User $user, string $feature): bool
    {
        if ($feature === self::FIND_AYAH) {
            return $user->hasProAccess();
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

    private function incrementDaily(User $user, string $feature, int $limit): bool
    {
        $period = Carbon::now('UTC')->toDateString();
        $now = now();

        DB::table('feature_usage_counters')->insertOrIgnore([
            'user_id' => $user->id,
            'feature' => $feature,
            'period_on' => $period,
            'consumed' => $this->usage->storedDailyAssessmentCount($user),
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
