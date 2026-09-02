<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Support\DatabaseDeploySafety;
use App\Support\Theme;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Ensures the one-click demo login account exists with a known password.
 * Allowed wherever SHOW_DEMO_ACCOUNTS is on, including production testers.
 * Never overwrites a real-user mailbox — emails must stay on a reserved demo domain.
 */
class EnsureDemoLoginAccount
{
    public const DEFAULT_EMAIL = 'layla.beginner@mutqin.test';

    public const DEFAULT_PASSWORD = 'DemoPass1!';

    public const DEFAULT_NAME = 'Tester — Beginner (EN)';

    public function ensure(): User
    {
        if (! config('app.show_demo_accounts')) {
            throw new RuntimeException(
                'Demo login is disabled (SHOW_DEMO_ACCOUNTS=false).'
            );
        }

        $email = (string) config('app.demo_login.email', self::DEFAULT_EMAIL);
        $password = (string) config('app.demo_login.password', self::DEFAULT_PASSWORD);
        $name = (string) config('app.demo_login.name', self::DEFAULT_NAME);

        DatabaseDeploySafety::assertDemoEmail($email, 'demo login');

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $user = new User;
            $user->email = $email;
        }

        $user->fill([
            'name' => $name,
            'password' => $password,
            'password_set_at' => $user->password_set_at ?? Carbon::now(),
            'locale' => $user->locale ?: 'en',
            'theme' => $user->theme ?: Theme::DEFAULT_PREFERENCE,
            'subscription_tier' => $user->subscription_tier ?: 'free',
            'subscription_plan' => $user->subscription_plan ?: 'free',
            'subscription_status' => $user->subscription_status ?: 'free',
        ]);

        // Demo login always bypasses email verification.
        if ($user->email_verified_at === null) {
            $user->email_verified_at = Carbon::now();
        }

        if (! $user->remember_token) {
            $user->remember_token = Str::random(10);
        }

        $user->save();

        return $user->fresh();
    }
}
