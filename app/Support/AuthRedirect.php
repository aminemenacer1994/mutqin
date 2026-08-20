<?php

namespace App\Support;

use App\Models\User;

/**
 * Single post-auth destination for login / guest redirects.
 * Admins land on the admin dashboard. New learners go straight to practice.
 * Returning learners land on their journey overview.
 */
final class AuthRedirect
{
    public static function routeName(?User $user, bool $justRegistered = false): string
    {
        if ($user?->isAdmin() === true) {
            return 'admin.dashboard';
        }

        return $justRegistered ? 'memorisation' : 'dashboard';
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
