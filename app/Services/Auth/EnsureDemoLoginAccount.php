<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Ensures the one-click demo login account exists with a known password.
 * Deployments often enable SHOW_DEMO_ACCOUNTS without re-running DemoDataSeeder.
 */
class EnsureDemoLoginAccount
{
    public const DEFAULT_EMAIL = 'layla.beginner@mutqin.test';

    public const DEFAULT_PASSWORD = 'DemoPass1!';

    public const DEFAULT_NAME = 'Tester — Beginner (EN)';

    public function ensure(): User
    {
        $email = (string) config('app.demo_login.email', self::DEFAULT_EMAIL);
        $password = (string) config('app.demo_login.password', self::DEFAULT_PASSWORD);
        $name = (string) config('app.demo_login.name', self::DEFAULT_NAME);

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
            'subscription_tier' => $user->subscription_tier ?: 'free',
            'subscription_plan' => $user->subscription_plan ?: 'free',
            'subscription_status' => $user->subscription_status ?: 'free',
        ]);

        if (! $user->email_verified_at) {
            $user->email_verified_at = Carbon::now();
        }

        if (! $user->remember_token) {
            $user->remember_token = Str::random(10);
        }

        $user->save();

        return $user->fresh();
    }
}
