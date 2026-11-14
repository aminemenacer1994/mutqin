<?php

namespace App\Services\Billing;

use App\Models\User;
use App\Services\Referrals\ReferralService;
use App\Support\Billing\SubscriptionAccess;
use Illuminate\Support\Carbon;

/**
 * Writes Stripe subscription snapshots onto the user row.
 * Payload events are ignored when a newer event was already applied.
 * A live Stripe fetch is authoritative and replaces the stored snapshot.
 */
class StripeSubscriptionSync
{
    public function apply(User $user, array $subscription, ?int $eventCreated = null, bool $authoritative = false): bool
    {
        if ($this->isLifetimeUser($user)) {
            return false;
        }

        $eventCreated = $eventCreated !== null ? $eventCreated : 0;
        $stored = (int) ($user->subscription_state_at ?? 0);

        if (! $authoritative && $eventCreated > 0 && $stored > $eventCreated) {
            return false;
        }

        $priceId = $this->priceId($subscription);
        $planKey = $this->planKeyForPrice($priceId)
            ?? $this->knownPlanKey($subscription['metadata']['plan'] ?? null)
            ?? $user->subscription_plan;
        $plan = $planKey ? config("billing.plans.$planKey") : null;
        $status = strtolower((string) ($subscription['status'] ?? 'incomplete'));
        $periodStart = $this->timestamp($subscription['current_period_start'] ?? null);
        $periodEnd = $this->timestamp($subscription['current_period_end'] ?? null);
        $cancelAtPeriodEnd = (bool) ($subscription['cancel_at_period_end'] ?? false);
        $entitled = SubscriptionAccess::statusGrantsAccess($status, $periodEnd, $cancelAtPeriodEnd);

        $tier = 'free';
        if ($entitled) {
            if (is_array($plan) && isset($plan['tier'])) {
                $tier = (string) $plan['tier'] === 'premium' ? 'pro' : (string) $plan['tier'];
            } elseif (in_array((string) $user->subscription_tier, ['pro', 'premium'], true)) {
                $tier = 'pro';
            }
        }

        $stateAt = $stored;
        if ($authoritative) {
            $stateAt = max($stored, $eventCreated, time());
        } elseif ($eventCreated > 0) {
            $stateAt = max($stored, $eventCreated);
        }

        $customerId = $subscription['customer'] ?? null;
        if (is_array($customerId)) {
            $customerId = $customerId['id'] ?? null;
        }

        $user->forceFill([
            'stripe_customer_id' => $customerId ?: $user->stripe_customer_id,
            'stripe_subscription_id' => $subscription['id'] ?? $user->stripe_subscription_id,
            'stripe_price_id' => $priceId ?: $user->stripe_price_id,
            'subscription_plan' => $planKey,
            'subscription_tier' => $tier,
            'subscription_status' => $status,
            'subscription_cancel_at_period_end' => $cancelAtPeriodEnd,
            'subscription_trial_ends_at' => $this->timestamp($subscription['trial_end'] ?? null),
            'subscription_current_period_starts_at' => $periodStart,
            'subscription_current_period_ends_at' => $periodEnd,
            'subscription_state_at' => $stateAt > 0 ? $stateAt : $user->subscription_state_at,
        ])->save();

        if ($tier === 'pro') {
            app(ReferralService::class)->recordProConversionIfEligible($user->fresh() ?? $user);
        }

        return true;
    }

    /**
     * One-time Pro lifetime checkout. Later subscription webhooks cannot revoke it.
     *
     * @param  array<string, mixed>  $session
     */
    public function applyLifetime(User $user, array $session, ?int $eventCreated = null): bool
    {
        $eventCreated = $eventCreated !== null ? $eventCreated : time();
        $stored = (int) ($user->subscription_state_at ?? 0);
        $stateAt = max($stored, $eventCreated, time());

        $customerId = $session['customer'] ?? null;
        if (is_array($customerId)) {
            $customerId = $customerId['id'] ?? null;
        }

        $priceId = $this->lifetimePriceId($session)
            ?: (string) (config('billing.plans.pro_lifetime.price_id') ?? '');

        $user->forceFill([
            'stripe_customer_id' => $customerId ?: $user->stripe_customer_id,
            'stripe_subscription_id' => null,
            'stripe_price_id' => $priceId !== '' ? $priceId : $user->stripe_price_id,
            'subscription_plan' => 'pro_lifetime',
            'subscription_tier' => 'pro',
            'subscription_status' => 'lifetime',
            'subscription_cancel_at_period_end' => false,
            'subscription_trial_ends_at' => null,
            'subscription_current_period_starts_at' => now(),
            'subscription_current_period_ends_at' => null,
            'subscription_state_at' => $stateAt,
        ])->save();

        app(ReferralService::class)->recordProConversionIfEligible($user->fresh() ?? $user);

        return true;
    }

    public function isLifetimeCheckout(array $session): bool
    {
        $plan = strtolower((string) ($session['metadata']['plan'] ?? ''));
        $type = strtolower((string) ($session['metadata']['type'] ?? ''));

        return $plan === 'pro_lifetime' || $type === 'lifetime';
    }

    private function isLifetimeUser(User $user): bool
    {
        return strtolower((string) $user->subscription_status) === 'lifetime'
            && strtolower((string) $user->subscription_plan) === 'pro_lifetime';
    }

    /**
     * @param  array<string, mixed>  $session
     */
    private function lifetimePriceId(array $session): ?string
    {
        $fromMeta = (string) ($session['metadata']['price_id'] ?? '');
        if ($fromMeta !== '') {
            return $fromMeta;
        }

        $lineItems = $session['line_items']['data'] ?? [];
        if (! is_array($lineItems) || $lineItems === []) {
            return null;
        }

        $price = $lineItems[0]['price'] ?? null;
        if (is_string($price) && $price !== '') {
            return $price;
        }
        if (is_array($price) && ! empty($price['id'])) {
            return (string) $price['id'];
        }

        return null;
    }

    public function planKeyForPrice(?string $priceId): ?string
    {
        if ($priceId === null || $priceId === '') {
            return null;
        }

        foreach (config('billing.plans', []) as $key => $plan) {
            if (! is_array($plan)) {
                continue;
            }
            if (($plan['price_id'] ?? null) === $priceId) {
                return (string) $key;
            }
            $legacy = $plan['legacy_price_ids'] ?? [];
            if (is_array($legacy) && in_array($priceId, $legacy, true)) {
                return (string) $key;
            }
        }

        return null;
    }

    private function knownPlanKey(mixed $plan): ?string
    {
        $key = strtolower(trim((string) $plan));
        if ($key === '' || ! is_array(config("billing.plans.$key"))) {
            return null;
        }

        return $key;
    }

    private function priceId(array $subscription): ?string
    {
        $price = $subscription['items']['data'][0]['price'] ?? null;
        if (is_string($price) && $price !== '') {
            return $price;
        }
        if (is_array($price) && ! empty($price['id'])) {
            return (string) $price['id'];
        }

        return null;
    }

    private function timestamp(mixed $value): ?Carbon
    {
        return $value ? Carbon::createFromTimestamp((int) $value) : null;
    }
}
