<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Production host split: mutqin.ai (marketing) vs app.mutqin.ai (application).
 * Local and automated tests keep a single host unless explicitly enabled.
 */
final class MutqinDomains
{
    private const DEFAULT_APP_HOST = 'app.mutqin.ai';
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

        return self::DEFAULT_APP_HOST;
    }

    /**
     * Apply waiting-list-only policy for the marketing host (runtime Host header).
     */
    /**
     * Early-access shell: Home and Waiting list only (English, no language switcher).
     */
    public static function usesEarlyAccessNav(Request $request): bool
    {
        return $request->routeIs('home', 'waiting-list')
            || $request->is('/', 'waiting-list');
    }

    /**
     * Paths served on mutqin.ai instead of redirecting to app.mutqin.ai.
     */
    public static function marketingHostWebPathAllowed(Request $request): bool
    {
        return $request->is(
            'waiting-list',
            'login',
            'logout',
            'admin/waiting-list',
            'admin/waiting-list/export',
        );
    }

    public static function restrictMarketingHost(Request $request): bool
    {
        if (filter_var(config('mutqin.domains.force_disabled'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        if (app()->runningUnitTests() && ! filter_var(config('mutqin.domains.enable_in_tests'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        if (app()->environment('local') && ! filter_var(config('mutqin.domains.enable_in_local'), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        return self::isMarketingHost($request->getHost());
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
     * Public signup must hit the application host on a CSRF-free path.
     * mutqin.ai is a separate Cloud app (its /api/* POSTs 500), and
     * Sanctum CSRF-checks /api/* when Origin is mutqin.ai (419).
     */
    public static function waitingListStoreUrl(?Request $request = null): string
    {
        $request ??= request();

        // Real mutqin.ai (marketing-only host) posts to app.mutqin.ai. Local dev,
        // including /etc/hosts mutqin.ai → 127.0.0.1, keeps same-origin so rows
        // show up in local phpMyAdmin.
        if (self::restrictMarketingHost($request)) {
            return self::appUrl('/join-waiting-list');
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
