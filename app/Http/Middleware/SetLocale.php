<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use App\Support\Theme;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES = ['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur'];
    private const RTL_LOCALES = ['ar', 'ur'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);
        $direction = in_array($locale, self::RTL_LOCALES, true) ? 'rtl' : 'ltr';
        $themePreference = $this->resolveThemePreference($request);

        App::setLocale($locale);
        View::share('appLocale', $locale);
        View::share('appDirection', $direction);
        View::share('appThemePreference', $themePreference);
        View::share('appTheme', Theme::toDataTheme($themePreference));

        $isApi = $request->is('api/*');
        if ($request->hasSession() && ! $isApi) {
            $request->session()->put('mutqin_theme', $themePreference);
        }

        $response = $next($request);

        // Auth may change during the request (login/logout). Re-resolve so the
        // response cookie matches the current account — never the previous one.
        $themePreference = $this->resolveThemePreference($request);
        View::share('appThemePreference', $themePreference);
        View::share('appTheme', Theme::toDataTheme($themePreference));
        if ($request->hasSession() && ! $isApi) {
            $request->session()->put('mutqin_theme', $themePreference);
        }

        if ($request->query('lang') && $response instanceof Response) {
            $response->headers->setCookie(cookie('mutqin_locale', $locale, 60 * 24 * 365, null, null, false, false, false, 'lax'));
        }

        if ($response instanceof Response && ! $isApi) {
            $this->queueThemeCookies($response, $request, $themePreference);
        }

        return $response;
    }

    private function resolveLocale(Request $request): string
    {
        if (MutqinDomains::usesEarlyAccessNav($request)) {
            return 'en';
        }

        $userLocale = $request->user()?->locale;

        $candidate = ($userLocale && in_array($userLocale, self::SUPPORTED_LOCALES, true))
            ? $userLocale
            : ($request->query('lang')
            ?: $request->cookie('mutqin_locale')
            ?: $request->getPreferredLanguage(self::SUPPORTED_LOCALES)
            ?: config('app.locale', 'en'));

        $locale = strtolower(substr((string) $candidate, 0, 2));

        return in_array($locale, self::SUPPORTED_LOCALES, true) ? $locale : 'en';
    }

    private function resolveThemePreference(Request $request): string
    {
        if (MutqinDomains::usesEarlyAccessNav($request)) {
            return Theme::DEFAULT_PREFERENCE;
        }

        $user = $request->user();
        if ($user) {
            $userTheme = $user->theme;
            if (is_string($userTheme) && $userTheme !== '') {
                return Theme::normalizePreference($userTheme);
            }

            // Signed-in accounts never inherit another person's cookie/session from a shared device.
            return Theme::DEFAULT_PREFERENCE;
        }

        // Guests default to light on SSR; persisted guest choice lives in localStorage (FOUC script).
        return Theme::DEFAULT_PREFERENCE;
    }

    private function queueThemeCookies(Response $response, Request $request, string $themePreference): void
    {
        $response->headers->setCookie(cookie(Theme::COOKIE, $themePreference, 60 * 24 * 365, null, null, false, false, false, 'lax'));
    }
}
