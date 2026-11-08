<?php

namespace App\Support;

use App\Models\User;

/**
 * Session voice setup is available while developing.
 * In production it is limited to the platform super admin.
 */
final class SessionVoiceAccess
{
    public const PRODUCTION_EMAIL = 'menacer72@gmail.com';

    public static function visible(?User $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        if (! app()->environment('production')) {
            return true;
        }

        return $user->isSuperAdmin()
            && AdminEmails::normalize($user->email) === self::PRODUCTION_EMAIL;
    }
}
