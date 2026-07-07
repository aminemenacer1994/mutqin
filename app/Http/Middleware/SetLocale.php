<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES = ['en', 'ar', 'fr', 'id', 'tr'];
    private const THEME_ALIASES = [
        'light' => 'light-mode',
        'light-mode' => 'light-mode',
        'dark' => 'dark-mode',
        'dark-mode' => 'dark-mode',
        'sepia' => 'sepia-mode',
        'sepia-mode' => 'sepia-mode',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);
        $direction = $locale === 'ar' ? 'rtl' : 'ltr';
        $themePreference = $this->resolveThemePreference($request);

        App::setLocale($locale);
        View::share('appLocale', $locale);
        View::share('appDirection', $direction);
        View::share('appThemePreference', $themePreference);
        View::share('appTheme', $this->themePreferenceToDataTheme($themePreference));

        $request->session()->put('mutqin_theme', $themePreference);

        $response = $next($request);

        if ($request->query('lang') && $response instanceof Response) {
            $response->headers->setCookie(cookie('mutqin_locale', $locale, 60 * 24 * 365, null, null, false, false, false, 'lax'));
        }

        if ($response instanceof Response) {
            $response->headers->setCookie(cookie('mutqin_theme', $themePreference, 60 * 24 * 365, null, null, false, false, false, 'lax'));
        }

        return $response;
    }

    private function resolveLocale(Request $request): string
    {
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
        $candidate = $request->session()->get('mutqin_theme')
            ?: $request->cookie('mutqin_theme')
            ?: 'light-mode';

        return self::THEME_ALIASES[strtolower((string) $candidate)] ?? 'light-mode';
    }

    private function themePreferenceToDataTheme(string $themePreference): string
    {
        return match ($themePreference) {
            'dark-mode' => 'dark',
            'sepia-mode' => 'sepia',
            default => 'light',
        };
    }
}
