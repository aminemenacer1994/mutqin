<?php

namespace App\Services\Referrals;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\Referral;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Analytics\ProductEventRecorder;
use App\Services\UserAiReciteUsageService;
use App\Support\Analytics\Acquisition;
use App\Support\Analytics\ProductEventName;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Owned invite codes, signup attribution, activation, and AI Recite rewards. */
final class ReferralService
{
    private const CODE_LENGTH = 10;

    private const CODE_ATTEMPTS = 12;

    public function __construct(
        private readonly ProductEventRecorder $events,
        private readonly UserAiReciteUsageService $aiUsage,
    ) {}

    public function ensureCode(User $user): string
    {
        $existing = Acquisition::token($user->referral_code);
        if ($existing !== null) {
            return $existing;
        }

        return DB::transaction(function () use ($user): string {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $existing = Acquisition::token($locked->referral_code);
            if ($existing !== null) {
                $user->setAttribute('referral_code', $existing);

                return $existing;
            }

            $code = $this->generateUniqueCode();
            $locked->forceFill(['referral_code' => $code])->save();
            $user->setAttribute('referral_code', $code);

            return $code;
        });
    }

    public function inviteUrl(User $user): string
    {
        $code = $this->ensureCode($user);

        return rtrim((string) config('app.url'), '/').'/?ref='.rawurlencode($code);
    }

    public function rewardAiChecksPerActivation(): int
    {
        return max(0, (int) config('mutqin.referrals.reward_ai_checks', 3));
    }

    public function attributeSignup(User $newUser, ?string $code): void
    {
        try {
            $token = Acquisition::token($code);
            if ($token === null) {
                return;
            }

            if ($newUser->referred_by_user_id !== null) {
                return;
            }

            if (Referral::query()->where('referred_user_id', $newUser->id)->exists()) {
                return;
            }

            $ownCode = Acquisition::token($newUser->referral_code);
            if ($ownCode !== null && strcasecmp($ownCode, $token) === 0) {
                return;
            }

            $referrer = User::query()
                ->where('referral_code', $token)
                ->whereNull('deleted_at')
                ->first();

            if (! $referrer || (int) $referrer->id === (int) $newUser->id) {
                return;
            }

            DB::transaction(function () use ($newUser, $referrer, $token): void {
                $locked = User::query()->whereKey($newUser->id)->lockForUpdate()->firstOrFail();
                if ($locked->referred_by_user_id !== null) {
                    return;
                }

                if (Referral::query()->where('referred_user_id', $locked->id)->exists()) {
                    return;
                }

                $locked->forceFill(['referred_by_user_id' => $referrer->id])->save();
                $newUser->setAttribute('referred_by_user_id', $referrer->id);

                Referral::query()->create([
                    'referrer_user_id' => $referrer->id,
                    'referred_user_id' => $locked->id,
                    'referral_code' => $token,
                    'signed_up_at' => $locked->created_at ?? now(),
                ]);
            });
        } catch (\Throwable $error) {
            report($error);
        }
    }

    public function activateIfEligible(User $user, UserSession $session): void
    {
        try {
            if ($session->is_onboarding_example || ! $session->id) {
                return;
            }

            $status = UserSessionStatus::tryFromMixed($session->status);
            if ($status !== UserSessionStatus::Completed) {
                return;
            }

            $referral = Referral::query()
                ->where('referred_user_id', $user->id)
                ->whereNull('activated_at')
                ->first();

            if (! $referral) {
                return;
            }

            $rewardAmount = $this->rewardAiChecksPerActivation();

            $activated = DB::transaction(function () use ($referral, $rewardAmount): ?Referral {
                $locked = Referral::query()->whereKey($referral->id)->lockForUpdate()->first();
                if (! $locked || $locked->activated_at !== null) {
                    return null;
                }

                $locked->forceFill([
                    'activated_at' => now(),
                ])->save();

                if ($locked->reward_granted_at === null && $rewardAmount > 0) {
                    $referrer = User::query()->whereKey($locked->referrer_user_id)->lockForUpdate()->first();
                    if ($referrer) {
                        $this->aiUsage->grantBonusChecks($referrer, $rewardAmount);
                        $locked->forceFill([
                            'reward_ai_checks' => $rewardAmount,
                            'reward_granted_at' => now(),
                        ])->save();
                    }
                }

                return $locked->fresh();
            });

            if (! $activated) {
                return;
            }

            $referrer = User::query()->find($activated->referrer_user_id);
            $this->events->recordQuietly(
                ProductEventName::REFERRAL_ACTIVATED,
                $referrer,
                null,
                'referral:'.$activated->id.':activated',
                ['feature_id' => 'referral'],
                ['referral_code' => $activated->referral_code],
            );
        } catch (\Throwable $error) {
            report($error);
        }
    }

    /**
     * Aggregate invite stats without exposing referred users' identities.
     *
     * @return array{
     *     code: string,
     *     url: string,
     *     link_visits: int,
     *     signups: int,
     *     activations: int,
     *     conversion_rate: float|null,
     *     pending_thanks: int,
     *     reward: array{per_activation: int, total_ai_checks_earned: int, bonus_remaining: int}
     * }
     */
    public function statsFor(User $user): array
    {
        $code = $this->ensureCode($user);
        $url = $this->inviteUrl($user);

        $signups = (int) Referral::query()->where('referrer_user_id', $user->id)->count();
        $activations = (int) Referral::query()
            ->where('referrer_user_id', $user->id)
            ->whereNotNull('activated_at')
            ->count();
        $pendingThanks = (int) Referral::query()
            ->where('referrer_user_id', $user->id)
            ->whereNotNull('activated_at')
            ->whereNull('acknowledged_at')
            ->count();

        $linkVisits = (int) ProductEvent::query()
            ->where('event_name', ProductEventName::REFERRAL_LINK_OPENED)
            ->where('referral_code', $code)
            ->count();

        $totalEarned = (int) Referral::query()
            ->where('referrer_user_id', $user->id)
            ->whereNotNull('reward_granted_at')
            ->sum('reward_ai_checks');

        $bonusRemaining = (int) User::query()
            ->whereKey($user->id)
            ->value('ai_recite_bonus_checks');

        return [
            'code' => $code,
            'url' => $url,
            'link_visits' => $linkVisits,
            'signups' => $signups,
            'activations' => $activations,
            'conversion_rate' => $signups > 0 ? round($activations / $signups, 4) : null,
            'pending_thanks' => $pendingThanks,
            'reward' => [
                'per_activation' => $this->rewardAiChecksPerActivation(),
                'total_ai_checks_earned' => $totalEarned,
                'bonus_remaining' => max(0, $bonusRemaining),
            ],
        ];
    }

    public function acknowledge(User $user): int
    {
        return (int) Referral::query()
            ->where('referrer_user_id', $user->id)
            ->whereNotNull('activated_at')
            ->whereNull('acknowledged_at')
            ->update(['acknowledged_at' => now()]);
    }

    private function generateUniqueCode(): string
    {
        for ($i = 0; $i < self::CODE_ATTEMPTS; $i++) {
            $candidate = Str::lower(Str::random(self::CODE_LENGTH));
            $token = Acquisition::token($candidate);
            if ($token === null) {
                continue;
            }

            $taken = User::withTrashed()
                ->where('referral_code', $token)
                ->exists();

            if (! $taken) {
                return $token;
            }
        }

        throw new \RuntimeException('Unable to allocate a unique referral code.');
    }
}
