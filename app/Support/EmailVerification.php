<?php

namespace App\Support;

use App\Services\Auth\EnsureDemoLoginAccount;

/**
 * Feature toggle for Laravel email verification (notice page, verified middleware, etc.).
 */
final class EmailVerification
{
    public static function required(): bool
    {
        return (bool) config('auth.require_email_verification', true);
    }

    /**
     * Tester accounts that sign in with the shared demo password skip the gate.
     * Real mailboxes never bypass, even if they happen to use the same password.
     */
    public static function bypassesForDemo(string $email, #[\SensitiveParameter] ?string $password): bool
    {
        if (! config('app.show_demo_accounts')) {
            return false;
        }

        if (! DatabaseDeploySafety::isDemoEmail($email)) {
            return false;
        }

        $expected = (string) config('app.demo_login.password', EnsureDemoLoginAccount::DEFAULT_PASSWORD);

        return is_string($password) && $password !== '' && hash_equals($expected, $password);
    }
}
