<?php

namespace App\Support;

use App\Models\User;

/**
 * Single post-auth destination for login / guest redirects.
 * Admins land on the admin dashboard. Unverified learners go to the
 * email verification notice. Verified learners go straight to practice so
 * Welcome Back / first-run onboarding can gate the workspace on arrival.
 */
final class AuthRedirect
{
    public static function routeName(?User $user, bool $justRegistered = false): string
    {
        if ($user?->isAdmin() === true) {
            return 'admin.dashboard';
        }

        // Email/password accounts must verify before practice; Google users with a
        // trusted provider-verified email already have email_verified_at set.
        if ($user !== null && ! $user->hasVerifiedEmail()) {
            return 'verification.notice';
        }

        return 'memorisation';
    }

    public static function to(?User $user, bool $justRegistered = false): string
    {
        return route(self::routeName($user, $justRegistered));
    }

    /**
     * Path form used by laravel/ui redirectTo() / $redirectTo.
     */
    public static function path(?User $user, bool $justRegistered = false): string
    {
        return route(self::routeName($user, $justRegistered), absolute: false);
    }
}
