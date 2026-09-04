<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Canonical Google OAuth redirect URI.
 *
 * Production / Laravel Cloud must send Google the same HTTPS callback that is
 * registered in Google Cloud Console (APP_URL / GOOGLE_REDIRECT_URI). Rewriting
 * that URI from the inbound Host / X-Forwarded-Host (e.g. *.laravel.cloud)
 * causes redirect_uri_mismatch and session cookies on the wrong host.
 *
 * Locally, localhost and 127.0.0.1 may swap because Google treats them as
 * distinct redirect URIs and developers use both.
 */
final class GoogleOAuthRedirect
{
    public const PATH = '/auth/google/callback';

    /**
     * Resolve the URI Socialite must use for this request (redirect + callback).
     */
    public static function uri(?Request $request = null): string
    {
        $appUrl = self::appUrl();
        $configured = '';
        if (! app()->environment('testing')) {
            $configured = self::runtime('GOOGLE_REDIRECT_URI');
        }
        if ($configured === '') {
            $configured = trim((string) config('services.google.redirect', ''));
        }

        $resolved = self::fromEnvironment($configured, $appUrl);

        if ($request && self::shouldUseLocalRequestHost($resolved, $request)) {
            return self::forRequest($request, $appUrl);
        }

        if ($resolved !== '') {
            return $resolved;
        }

        if ($request?->getHttpHost()) {
            return self::forRequest($request, $appUrl);
        }

        return $appUrl !== '' ? $appUrl.self::PATH : self::PATH;
    }

    /**
     * Expand env placeholders and normalise a configured redirect URI.
     * Safe to call from config/services.php (no container required).
     */
    public static function fromEnvironment(?string $redirectUri, ?string $appUrl): string
    {
        $appUrl = rtrim(trim((string) $appUrl), '/');
        $redirectUri = trim((string) $redirectUri);

        if ($redirectUri !== '') {
            $redirectUri = str_replace(['${APP_URL}', '$APP_URL'], $appUrl, $redirectUri);
            $redirectUri = trim($redirectUri);
        }

        if ($redirectUri === '' || str_contains($redirectUri, '${')) {
            $redirectUri = $appUrl !== '' ? $appUrl.self::PATH : '';
        }

        return self::normalise($redirectUri, $appUrl);
    }

    public static function isLoopbackHost(?string $host): bool
    {
        $host = strtolower(trim((string) $host));

        return in_array($host, ['localhost', '127.0.0.1', '[::1]', '::1'], true);
    }

    private static function normalise(string $uri, string $appUrl): string
    {
        $uri = trim($uri);
        if ($uri === '') {
            return '';
        }

        $path = parse_url($uri, PHP_URL_PATH);
        if ($path === null || $path === '' || $path === '/') {
            $uri = rtrim($uri, '/').self::PATH;
        } else {
            $uri = rtrim($uri, '/');
        }

        if ($appUrl !== '' && str_starts_with($appUrl, 'https://') && str_starts_with($uri, 'http://')) {
            $uri = 'https://'.substr($uri, strlen('http://'));
        }

        return $uri;
    }

    private static function shouldUseLocalRequestHost(string $configured, Request $request): bool
    {
        $requestHost = $request->getHost();
        $configuredHost = parse_url($configured, PHP_URL_HOST);

        if (! is_string($configuredHost) || $configuredHost === '' || $requestHost === '') {
            return false;
        }

        if (strcasecmp($configuredHost, $requestHost) === 0) {
            return false;
        }

        return self::isLoopbackHost($configuredHost) && self::isLoopbackHost($requestHost);
    }

    private static function forRequest(Request $request, string $appUrl): string
    {
        $scheme = $request->getScheme();
        $host = $request->getHost();

        if (! self::isLoopbackHost($host) && (
            str_starts_with($appUrl, 'https://')
            || $request->isSecure()
            || (function_exists('laravel_cloud') && laravel_cloud())
        )) {
            $scheme = 'https';
        }

        return $scheme.'://'.$request->getHttpHost().self::PATH;
    }

    private static function appUrl(): string
    {
        if (! app()->environment('testing')) {
            $fromEnv = self::runtime('APP_URL');
            if ($fromEnv !== '') {
                return rtrim($fromEnv, '/');
            }
        }

        return rtrim(trim((string) config('app.url', 'http://localhost')), '/');
    }

    private static function runtime(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

        if ($value === false || $value === null) {
            return '';
        }

        return trim((string) $value);
    }
}
