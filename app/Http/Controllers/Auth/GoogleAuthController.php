<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return $this->googleProvider()->redirect();
    }

    public function callback(): RedirectResponse
    {
        $created = false;

        try {
            $googleUser = $this->googleProvider()->user();
        } catch (Throwable) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => 'Unable to sign in with Google. Please try again.']);
        }

        $email = $googleUser->getEmail();

        if (! $email) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => 'Google did not return an email address for this account.']);
        }

        $user = User::where('google_id', $googleUser->getId())->first();

        if (! $user) {
            $user = User::where('email', $email)->first();

            if ($user) {
                $user->forceFill([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ])->save();
            } else {
                $user = User::create([
                    'name' => $googleUser->getName() ?: Str::before($email, '@'),
                    'email' => $email,
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'password' => Str::random(32),
                ]);
                $created = true;
            }
        } elseif ($googleUser->getAvatar() !== $user->avatar) {
            $user->forceFill([
                'avatar' => $googleUser->getAvatar(),
            ])->save();
        }

        Auth::login($user, true);
        request()->session()->regenerate();
        request()->session()->put('mutqin_login_event_id', (string) Str::uuid());
        if ($created) {
            request()->session()->flash('mutqin_just_registered', true);
            // Existing-user Welcome Back must not win over first-run onboarding.
            request()->session()->forget('mutqin_just_logged_in');
        } else {
            request()->session()->flash('mutqin_just_logged_in', true);
        }

        return redirect()->intended(route('memorisation'));
    }

    private function googleProvider()
    {
        $provider = Socialite::driver('google')
            ->redirectUrl($this->googleRedirectUrl());

        if (is_callable([$provider, 'stateless'])) {
            $provider = $provider->stateless();
        }

        return $provider;
    }

    private function googleRedirectUrl(): string
    {
        $configured = trim((string) config('services.google.redirect', ''));

        if ($configured !== '' && ! str_contains($configured, '${')) {
            if (app()->isLocal() && ($requestHost = request()?->getHost())) {
                $configuredHost = parse_url($configured, PHP_URL_HOST);
                // localhost vs 127.0.0.1 must match the browser host exactly for Google.
                if (is_string($configuredHost) && strcasecmp($configuredHost, $requestHost) !== 0) {
                    return $this->callbackUrlForRequest();
                }
            }

            return $configured;
        }

        if (request()?->getHttpHost()) {
            return $this->callbackUrlForRequest();
        }

        return route('auth.google.callback');
    }

    private function callbackUrlForRequest(): string
    {
        return rtrim((string) request()->getSchemeAndHttpHost(), '/').'/auth/google/callback';
    }
}
