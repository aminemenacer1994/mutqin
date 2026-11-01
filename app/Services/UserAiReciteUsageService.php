<?php

namespace App\Services;

use App\Models\MemorisationAssessment;
use App\Models\User;

/**
 * Lifetime AI voice-check usage (MemorisationAssessment rows) for admin limits.
 */
class UserAiReciteUsageService
{
    public const REASON = 'lifetime_limit';

    public const LEARNER_MESSAGE = 'You have reached your AI voice-check limit. Contact support if you need more checks.';

    public function lifetimeCheckCount(User $user): int
    {
        return (int) MemorisationAssessment::query()
            ->where('user_id', $user->id)
            ->count();
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

    /**
     * @return array{
     *     used: int,
     *     limit: int|null,
     *     remaining: int|null,
     *     allowed: bool
     * }
     */
    public function inspect(User $user): array
    {
        $used = $this->lifetimeCheckCount($user);
        $limit = $this->resolvedLifetimeLimit($user);
        $allowed = $limit === null || $used < $limit;
        $remaining = $limit === null ? null : max(0, $limit - $used);

        return [
            'used' => $used,
            'limit' => $limit,
            'remaining' => $remaining,
            'allowed' => $allowed,
        ];
    }

    public function wouldAllowAnotherCheck(User $user): bool
    {
        return $this->inspect($user)['allowed'];
    }
}
