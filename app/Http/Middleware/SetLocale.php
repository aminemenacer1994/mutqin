<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES = ['en', 'ar', 'fr'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);
        $direction = $locale === 'ar' ? 'rtl' : 'ltr';

        App::setLocale($locale);
        View::share('appLocale', $locale);
        View::share('appDirection', $direction);

        $response = $next($request);

        if ($request->query('lang') && $response instanceof Response) {
            $response->headers->setCookie(cookie('mutqin_locale', $locale, 60 * 24 * 365, null, null, false, false, false, 'lax'));
        }

        return $response;
    }

    private function resolveLocale(Request $request): string
    {
        $candidate = $request->query('lang')
            ?: $request->cookie('mutqin_locale')
            ?: $request->getPreferredLanguage(self::SUPPORTED_LOCALES)
            ?: config('app.locale', 'en');

        $locale = strtolower(substr((string) $candidate, 0, 2));

        return in_array($locale, self::SUPPORTED_LOCALES, true) ? $locale : 'en';
    }
}
