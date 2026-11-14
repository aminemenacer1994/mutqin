<?php

namespace App\Services\Referrals;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\Referral;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Analytics\ProductEventRecorder;
use App\Support\Analytics\Acquisition;
use App\Support\Analytics\ProductEventName;
use App\Support\Billing\SubscriptionAccess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Owned invite codes, attribution, activation, and Pro-conversion free-month rewards. */
final class ReferralService
{
    private const CODE_LENGTH = 10;

    private const CODE_ATTEMPTS = 12;

    public function __construct(private readonly ProductEventRecorder $events) {}

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

    public function proSignupsForFreeMonth(): int
    {
        return max(1, (int) config('mutqin.referrals.pro_signups_for_free_month', 3));
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

            $updated = Referral::query()
                ->whereKey($referral->id)
                ->whereNull('activated_at')
                ->update(['activated_at' => now()]);

            if ($updated < 1) {
                return;
            }

            $referrer = User::query()->find($referral->referrer_user_id);
            $this->events->recordQuietly(
                ProductEventName::REFERRAL_ACTIVATED,
                $referrer,
                null,
                'referral:'.$referral->id.':activated',
                ['feature_id' => 'referral'],
                ['referral_code' => $referral->referral_code],
            );
        } catch (\Throwable $error) {
            report($error);
        }
    }

    /**
     * When a referred learner becomes Pro, count them once and grant free months
     * for every completed batch of N Pro conversions.
     */
    public function recordProConversionIfEligible(User $user): void
    {
        try {
            if (! $this->userHoldsProEntitlement($user)) {
                return;
            }

            $referral = Referral::query()
                ->where('referred_user_id', $user->id)
                ->whereNull('converted_to_pro_at')
                ->first();

            if (! $referral) {
                return;
            }

            DB::transaction(function () use ($referral): void {
                $locked = Referral::query()->whereKey($referral->id)->lockForUpdate()->first();
                if (! $locked || $locked->converted_to_pro_at !== null) {
                    return;
                }

                $locked->forceFill(['converted_to_pro_at' => now()])->save();

                $referrer = User::query()->whereKey($locked->referrer_user_id)->lockForUpdate()->first();
                if (! $referrer) {
                    return;
                }

                $granted = $this->grantDueFreeMonths($referrer);
                if ($granted > 0 && $locked->free_month_rewarded_at === null) {
                    $locked->forceFill(['free_month_rewarded_at' => now()])->save();
                }
            });
        } catch (\Throwable $error) {
            report($error);
        }
    }

    /**
     * Extend complimentary Pro by one month from the later of now or current complimentary end.
     */
    public function grantComplimentaryProMonth(User $user): Carbon
    {
        $now = now();
        $current = $user->complimentary_pro_until;
        $base = ($current instanceof Carbon && $current->isFuture()) ? $current->copy() : $now->copy();
        $until = $base->addMonth();

        $user->forceFill([
            'complimentary_pro_until' => $until,
            'referral_free_months_granted' => max(0, (int) $user->referral_free_months_granted) + 1,
        ])->save();

        return $until;
    }

    /**
     * @return array{
     *     code: string,
     *     url: string,
     *     link_visits: int,
     *     signups: int,
     *     activations: int,
     *     conversion_rate: float|null,
     *     pending_thanks: int,
     *     reward: array{
     *         pro_signups_needed: int,
     *         pro_signups: int,
     *         progress_in_cycle: int,
     *         free_months_earned: int,
     *         complimentary_pro_until: string|null
     *     }
     * }
     */
    public function statsFor(User $user): array
    {
        $code = $this->ensureCode($user);
        $url = $this->inviteUrl($user);
        $needed = $this->proSignupsForFreeMonth();

        $signups = (int) Referral::query()->where('referrer_user_id', $user->id)->count();
        $activations = (int) Referral::query()
            ->where('referrer_user_id', $user->id)
            ->whereNotNull('activated_at')
            ->count();
        $proSignups = (int) Referral::query()
            ->where('referrer_user_id', $user->id)
            ->whereNotNull('converted_to_pro_at')
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

        $fresh = User::query()->whereKey($user->id)->first(['complimentary_pro_until', 'referral_free_months_granted']);
        $until = $fresh?->complimentary_pro_until;

        return [
            'code' => $code,
            'url' => $url,
            'link_visits' => $linkVisits,
            'signups' => $signups,
            'activations' => $activations,
            'conversion_rate' => $signups > 0 ? round($activations / $signups, 4) : null,
            'pending_thanks' => $pendingThanks,
            'reward' => [
                'pro_signups_needed' => $needed,
                'pro_signups' => $proSignups,
                'progress_in_cycle' => $needed > 0 ? ($proSignups % $needed) : 0,
                'free_months_earned' => max(0, (int) ($fresh?->referral_free_months_granted ?? 0)),
                'complimentary_pro_until' => ($until instanceof Carbon && $until->isFuture())
                    ? $until->toIso8601String()
                    : null,
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

    private function grantDueFreeMonths(User $referrer): int
    {
        $needed = $this->proSignupsForFreeMonth();
        $proSignups = (int) Referral::query()
            ->where('referrer_user_id', $referrer->id)
            ->whereNotNull('converted_to_pro_at')
            ->count();

        $earned = intdiv($proSignups, $needed);
        $already = max(0, (int) $referrer->referral_free_months_granted);
        $due = max(0, $earned - $already);

        for ($i = 0; $i < $due; $i++) {
            $this->grantComplimentaryProMonth($referrer);
            $referrer->refresh();
        }

        return $due;
    }

    private function userHoldsProEntitlement(User $user): bool
    {
        if (SubscriptionAccess::hasComplimentaryPro($user)) {
            return true;
        }

        if (! SubscriptionAccess::grantsPaidAccess($user)) {
            return false;
        }

        $tier = strtolower((string) ($user->subscription_tier ?? ''));

        return in_array($tier, ['pro', 'premium'], true)
            || strtolower((string) $user->subscription_status) === 'lifetime';
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
