<?php

namespace App\Support;

/**
 * Demo login and tester affordances (never shown on the public login form).
 */
final class DemoAccounts
{
    /** One-click demo card on /login — permanently off. */
    public static function loginUiEnabled(): bool
    {
        return false;
    }

    /** POST /login/demo and related tester hooks (local/staging only). */
    public static function routeEnabled(): bool
    {
        if (app()->environment('production')) {
            return false;
        }

        return (bool) config('app.show_demo_accounts', false);
    }
}
