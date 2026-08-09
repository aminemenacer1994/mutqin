<?php

namespace App\Support;

use App\Models\User;

/**
 * Single post-auth destination for login / guest redirects.
 * Admins land on the admin dashboard; learners keep the memorisation workspace.
 */
final class AuthRedirect
{
    public static function routeName(?User $user): string
    {
        return $user?->isAdmin() === true ? 'admin.dashboard' : 'memorisation';
    }

    public static function to(?User $user): string
    {
        return route(self::routeName($user));
    }

    /**
     * Path form used by laravel/ui redirectTo() / $redirectTo.
     */
    public static function path(?User $user): string
    {
        return route(self::routeName($user), absolute: false);
    }
}
