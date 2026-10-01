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

    public static function isMarketingHost(?string $host): bool
    {
        $host = strtolower(trim((string) $host));

        return $host !== '' && $host === self::marketingHost();
    }

    public static function isAppHost(?string $host): bool
    {
        $host = strtolower(trim((string) $host));

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

    private static function hostsDiffer(): bool
    {
        $marketing = self::marketingHost();
        $app = self::appHost();

        return $marketing !== '' && $app !== '' && $marketing !== $app;
    }
}
