<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        if ($error = $this->googleConfigError()) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => $error]);
        }

        $this->syncGoogleConfig();

        return $this->googleProvider()->redirect();
    }

    public function callback(): RedirectResponse
    {
        if ($error = $this->googleConfigError()) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => $error]);
        }

        $this->syncGoogleConfig();

        $created = false;

        try {
            $googleUser = $this->googleProvider()->user();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth callback failed', [
                'message' => $exception->getMessage(),
            ]);

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

    /**
     * Prefer live process env over config cache so Laravel Cloud deploys cannot
     * keep serving a stale/empty GOOGLE_CLIENT_ID after secrets are updated.
     */
    private function syncGoogleConfig(): void
    {
        config([
            'services.google.client_id' => $this->googleClientId(),
            'services.google.client_secret' => $this->googleClientSecret(),
            'services.google.redirect' => $this->googleRedirectUrl(),
        ]);
    }

    private function googleConfigError(): ?string
    {
        $clientId = $this->googleClientId();
        $clientSecret = $this->googleClientSecret();

        if ($clientId === '' || $clientSecret === '') {
            return 'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then redeploy.';
        }

        if (! str_ends_with($clientId, '.apps.googleusercontent.com')) {
            return 'GOOGLE_CLIENT_ID looks invalid. Paste the full Client ID from Google Cloud Console (ends with .apps.googleusercontent.com).';
        }

        return null;
    }

    private function googleClientId(): string
    {
        if (app()->environment('testing')) {
            return trim((string) config('services.google.client_id', ''));
        }

        return $this->runtimeEnv('GOOGLE_CLIENT_ID')
            ?: trim((string) config('services.google.client_id', ''));
    }

    private function googleClientSecret(): string
    {
        if (app()->environment('testing')) {
            return trim((string) config('services.google.client_secret', ''));
        }

        return $this->runtimeEnv('GOOGLE_CLIENT_SECRET')
            ?: trim((string) config('services.google.client_secret', ''));
    }

    private function runtimeEnv(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

        if ($value === false || $value === null) {
            return '';
        }

        return trim((string) $value);
    }

    private function googleRedirectUrl(): string
    {
        $configured = trim((string) (
            $this->runtimeEnv('GOOGLE_REDIRECT_URI')
            ?: config('services.google.redirect', '')
        ));

        if ($configured !== '' && ! str_contains($configured, '${')) {
            if ($requestHost = request()?->getHost()) {
                $configuredHost = parse_url($configured, PHP_URL_HOST);
                // Browser host must match redirect host exactly (localhost vs 127.0.0.1,
                // or a custom domain vs *.laravel.cloud).
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
