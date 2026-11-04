<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * mutqin.ai is the public application host.
 */
final class MutqinDomains
{
    private const DEFAULT_APP_HOST = 'mutqin.ai';

    public static function marketingHost(): string
    {
        return strtolower(trim((string) config('mutqin.domains.marketing_host', 'mutqin.ai')));
    }

    public static function appHost(): string
    {
        $configured = strtolower(trim((string) config('mutqin.domains.app_host', '')));
        if ($configured !== '') {
            return $configured;
        }

        $fromAppUrl = parse_url((string) config('app.url'), PHP_URL_HOST);
        $fromAppUrl = is_string($fromAppUrl) ? strtolower($fromAppUrl) : '';
        $marketing = self::marketingHost();

        if ($fromAppUrl !== '' && $fromAppUrl !== $marketing) {
            return $fromAppUrl;
        }

        return $marketing !== '' ? $marketing : self::DEFAULT_APP_HOST;
    }

    /**
     * The waiting-list page keeps its focused early-access navigation.
     */
    public static function usesEarlyAccessNav(Request $request): bool
    {
        return $request->routeIs('waiting-list', 'marketing.waiting-list')
            || $request->is('waiting-list');
    }

    /**
     * mutqin.ai is the application. Never swap in the early-access marketing shell.
     */
    public static function restrictMarketingHost(Request $request): bool
    {
        return false;
    }

    /**
     * When hosts differ, production GET/HEAD on the legacy app host redirect to mutqin.ai.
     * Local and default test runs stay on the current host.
     */
    public static function canonicalizePublicHost(): bool
    {
        if (filter_var(config('mutqin.domains.force_disabled'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        if (app()->runningUnitTests() && ! filter_var(config('mutqin.domains.enable_in_tests'), FILTER_VALIDATE_BOOL)
            && ! filter_var(config('mutqin.domains.force_enabled'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        if (app()->environment('local') && ! filter_var(config('mutqin.domains.enable_in_local'), FILTER_VALIDATE_BOOL)
            && ! filter_var(config('mutqin.domains.force_enabled'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        return self::hostsDiffer();
    }

    /**
     * Public URL on mutqin.ai when host canonicalization is on, otherwise the current app URL.
     */
    public static function canonicalUrl(string $path = '/'): string
    {
        $path = '/'.ltrim($path, '/');
        if ($path === '//') {
            $path = '/';
        }

        if (self::canonicalizePublicHost()) {
            return self::marketingOrigin().$path;
        }

        return url($path);
    }

    public static function hostRoutingEnabled(): bool
    {
        if (filter_var(config('mutqin.domains.force_enabled'), FILTER_VALIDATE_BOOL)) {
            return self::hostsDiffer();
        }

        if (filter_var(config('mutqin.domains.force_disabled'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        if (app()->runningUnitTests() && ! filter_var(config('mutqin.domains.enable_in_tests'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        if (app()->environment('local') && ! filter_var(config('mutqin.domains.enable_in_local'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        return self::hostsDiffer();
    }

    public static function normalizeHost(?string $host): string
    {
        $host = strtolower(trim((string) $host));
        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        return $host;
    }

    public static function isMarketingHost(?string $host): bool
    {
        $host = self::normalizeHost($host);

        return $host !== '' && $host === self::marketingHost();
    }

    public static function isAppHost(?string $host): bool
    {
        $host = self::normalizeHost($host);

        return $host !== '' && $host === self::appHost();
    }

    /**
     * Absolute origin for the application host (session + Sanctum live here).
     */
    public static function appOrigin(): string
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $scheme = parse_url($appUrl, PHP_URL_SCHEME);
        if (! is_string($scheme) || $scheme === '') {
            $scheme = 'https';
        }

        return $scheme.'://'.self::appHost();
    }

    public static function appUrl(string $path = '/'): string
    {
        $path = '/'.ltrim($path, '/');

        return self::appOrigin().($path === '//' ? '/' : $path);
    }

    /**
     * Absolute origin for the public marketing site (https://mutqin.ai).
     */
    public static function marketingOrigin(): string
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $scheme = parse_url($appUrl, PHP_URL_SCHEME);
        if (! is_string($scheme) || $scheme === '') {
            $scheme = 'https';
        }

        return $scheme.'://'.self::marketingHost();
    }

    public static function marketingUrl(string $path = '/'): string
    {
        $path = '/'.ltrim($path, '/');

        return self::marketingOrigin().($path === '//' ? '/' : $path);
    }

    /**
     * Admin UI (https://mutqin.ai/admin) — same host as the public app when canonicalized.
     */
    public static function adminUrl(string $suffix = ''): string
    {
        $suffix = ltrim($suffix, '/');
        $path = $suffix === '' ? '/admin' : '/admin/'.$suffix;

        return self::canonicalUrl($path);
    }

    public static function hostsDifferForSeo(): bool
    {
        return self::hostRoutingEnabled();
    }

    /**
     * Public signup uses a CSRF-free path on the same origin as the waiting-list page.
     */
    public static function waitingListStoreUrl(?Request $request = null): string
    {
        $request ??= request();

        // Keep local development and tests on the host that rendered the page.
        // This also makes /etc/hosts mappings behave like a normal same-origin
        // form and keeps registrations in the local database.
        if (app()->environment('local', 'testing')) {
            return rtrim($request->getSchemeAndHttpHost(), '/').'/join-waiting-list';
        }

        return url('/join-waiting-list');
    }

    private static function hostsDiffer(): bool
    {
        $marketing = self::marketingHost();
        $app = self::appHost();

        return $marketing !== '' && $app !== '' && $marketing !== $app;
    }
}
