<?php

namespace App\Support;

use App\Models\User;

/**
 * Advanced Analytics is temporarily limited to the platform super admin.
 */
final class AdvancedAnalyticsAccess
{
    public const ALLOWED_EMAIL = 'menacer72@gmail.com';

    public static function visible(?User $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        return $user->isSuperAdmin()
            && AdminEmails::normalize($user->email) === self::ALLOWED_EMAIL;
    }
}
