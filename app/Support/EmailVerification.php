<?php

namespace App\Support;

use App\Models\User;
use App\Services\Auth\EnsureDemoLoginAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

/**
 * Feature toggle for Laravel email verification (notice page, verified middleware, etc.).
 */
final class EmailVerification
{
    public static function required(): bool
    {
        return (bool) config('auth.require_email_verification', false);
    }

    /**
     * Follow a signed verification URL after login (Outlook/Edge often open
     * the link in a browser with no session). Never follow other intended URLs.
     */
    public static function signedVerificationIntended(?string $intended, User $user): ?string
    {
        if (! is_string($intended) || $intended === '') {
            return null;
        }

        $parts = parse_url($intended);
        if ($parts === false) {
            return null;
        }

        if (isset($parts['host'])) {
            $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
            if (! is_string($appHost) || $appHost === '' || strcasecmp((string) $parts['host'], $appHost) !== 0) {
                return null;
            }
        }

        $path = $parts['path'] ?? '';
        if (! is_string($path) || ! preg_match('#^/email/verify/([^/]+)/([^/]+)$#', $path, $matches)) {
            return null;
        }

        if (! hash_equals((string) $user->getKey(), (string) $matches[1])) {
            return null;
        }

        try {
            $request = Request::create($intended, 'GET');
        } catch (\Throwable) {
            return null;
        }

        if (! URL::hasValidSignature($request)) {
            return null;
        }

        return $intended;
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
