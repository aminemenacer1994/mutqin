<?php

namespace App\Support\Billing;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Paid access is derived from stored Stripe state, never from the browser.
 *
 * active, trialing — access while the period has not ended (a missing period end
 * still counts, so older rows are not cut off).
 * past_due — access until the current period end, then Free.
 * canceled with cancel_at_period_end — access until that period end.
 * unpaid, incomplete, incomplete_expired, paused, and a finished cancellation — Free.
 */
final class SubscriptionAccess
{
    public const ENTITLED_STATUSES = ['active', 'trialing', 'lifetime'];

    public static function grantsPaidAccess(User $user): bool
    {
        if (self::hasComplimentaryPro($user)) {
            return true;
        }

        return self::statusGrantsAccess(
            (string) $user->subscription_status,
            $user->subscription_current_period_ends_at,
            (bool) $user->subscription_cancel_at_period_end,
        );
    }

    /** Local complimentary Pro (e.g. referral reward). Not cleared by Stripe sync. */
    public static function hasComplimentaryPro(User $user): bool
    {
        $until = $user->complimentary_pro_until;
        if (! $until instanceof Carbon) {
            return false;
        }

        return $until->isFuture();
    }

    public static function statusGrantsAccess(string $status, ?Carbon $periodEnd, bool $cancelAtPeriodEnd): bool
    {
        $status = strtolower($status);

        if (in_array($status, self::ENTITLED_STATUSES, true)) {
            return $periodEnd === null || $periodEnd->isFuture();
        }

        if ($status === 'past_due') {
            return $periodEnd !== null && $periodEnd->isFuture();
        }

        if (in_array($status, ['canceled', 'cancelled'], true) && $cancelAtPeriodEnd) {
            return $periodEnd !== null && $periodEnd->isFuture();
        }

        return false;
    }
}
