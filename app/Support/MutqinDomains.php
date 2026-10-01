<?php

namespace App\Support;

/**
 * Production host split: mutqin.ai (marketing) vs app.mutqin.ai (application).
 * Local and automated tests keep a single host unless explicitly enabled.
 */
final class MutqinDomains
{
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

        $host = parse_url((string) config('app.url'), PHP_URL_HOST);

        return is_string($host) ? strtolower($host) : '';
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
        return rtrim((string) config('app.url'), '/');
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
