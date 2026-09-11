<?php

namespace App\Support;

use App\Models\User;

/**
 * Single post-auth destination for login / guest redirects.
 * Verified admins and learners both land on memorisation (not Progress).
 * Unverified accounts go to the email verification notice.
 * Get Pro from /pricing stores a plan and resumes Stripe checkout after auth.
 */
final class AuthRedirect
{
    public static function routeName(?User $user, bool $justRegistered = false): string
    {
        // Email/password accounts must verify before practice; Google users with a
        // trusted provider-verified email already have email_verified_at set.
        if ($user !== null && ! $user->hasVerifiedEmail()) {
            return 'verification.notice';
        }

        return 'memorisation';
    }

    public static function to(?User $user, bool $justRegistered = false): string
    {
        return self::url($user, $justRegistered, absolute: true);
    }

    /**
     * Path form used by laravel/ui redirectTo() / $redirectTo.
     */
    public static function path(?User $user, bool $justRegistered = false): string
    {
        return self::url($user, $justRegistered, absolute: false);
    }

    private static function url(?User $user, bool $justRegistered, bool $absolute): string
    {
        if ($user !== null && $user->hasVerifiedEmail()) {
            $plan = BillingIntent::peek();
            if ($plan !== null) {
                return route('pricing', [
                    'plan' => $plan,
                    'checkout' => 1,
                ], $absolute);
            }
        }

        return route(self::routeName($user, $justRegistered), absolute: $absolute);
    }
}
