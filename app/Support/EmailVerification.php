<?php

namespace App\Support;

/**
 * Feature toggle for Laravel email verification (notice page, verified middleware, etc.).
 */
final class EmailVerification
{
    public static function required(): bool
    {
        return (bool) config('auth.require_email_verification', false);
    }
}
