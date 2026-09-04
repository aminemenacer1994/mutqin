<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminDashboardService;
use App\Services\Auth\GoogleSignInService;
use App\Support\AuthRedirect;
use App\Support\GoogleOAuthRedirect;
use App\Support\Theme;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly GoogleSignInService $googleSignIn
    ) {}

    public function redirect(): RedirectResponse
    {
        if ($error = $this->googleConfigError()) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => $error]);
        }

        $this->syncGoogleConfig();

        // Authenticated users start an explicit link flow (never email-only auto-link).
        if (Auth::check()) {
            request()->session()->put('google_link_intent', true);
        } else {
            request()->session()->forget('google_link_intent');
        }

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

        try {
            $googleUser = $this->googleProvider()->user();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth callback failed', [
                'message' => $exception->getMessage(),
            ]);

            return redirect()
                ->route('login')
                ->withErrors(['google' => GoogleSignInService::GENERIC_FAILURE]);
        }

        $result = $this->googleSignIn->resolve($googleUser, Auth::user());

        if ($result['error'] !== null || $result['user'] === null) {
            request()->session()->forget('google_link_intent');
            $redirectTo = Auth::check() ? route('profile.show') : route('login');

            return redirect()
                ->to($redirectTo)
                ->withErrors(['google' => $result['error'] ?? GoogleSignInService::GENERIC_FAILURE]);
        }

        $user = $result['user'];
        $created = $result['created'];
        $linkingFromProfile = (bool) request()->session()->pull('google_link_intent');

        $user->touchLastLogin();
        AdminDashboardService::invalidateCaches();

        Auth::login($user, true);
        request()->session()->regenerate();
        if ($user instanceof User && (! is_string($user->theme) || $user->theme === '')) {
            $user->forceFill(['theme' => Theme::DEFAULT_PREFERENCE])->save();
        }
        request()->session()->put('mutqin_login_event_id', (string) Str::uuid());
        if ($created) {
            request()->session()->put('mutqin_just_registered', true);
            // Existing-user Welcome Back must not win over first-run onboarding.
            request()->session()->forget('mutqin_just_logged_in');
        } else {
            // Put (not flash): survive any hop before /memorisation consumes it.
            request()->session()->put('mutqin_just_logged_in', true);
            request()->session()->forget('mutqin_just_registered');
        }

        if ($linkingFromProfile && ! $created) {
            return redirect()
                ->route('profile.show')
                ->with('profile_status', __('profile.google_linked_success'));
        }

        request()->session()->forget('url.intended');

        return redirect()->to(AuthRedirect::to($user, justRegistered: $created));
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
        return GoogleOAuthRedirect::uri(request());
    }
}
