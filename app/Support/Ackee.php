<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Public Ackee tracker config for Blade → window.mutqinAckee.
 * Domain IDs and the event ID are tracker tokens, not secrets.
 */
final class Ackee
{
    private const UUID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

    public static function clientConfig(?Request $request = null): array
    {
        $request = $request ?? request();
        $server = self::sanitiseServer((string) config('services.ackee.server', ''));
        $domainId = self::domainIdForHost($request->getHost());
        $eventId = self::sanitiseUuid((string) config('services.ackee.event_id', ''));
        $allowLocalhost = (bool) config('services.ackee.allow_localhost', false);

        $connectPermitted = self::isConnectSrcPermitted($server, $request);

        $enabled = (bool) config('services.ackee.enabled')
            && $server !== ''
            && $domainId !== ''
            && ! $request->boolean('mutqin_embed')
            && ($allowLocalhost || ! self::isLocalHost($request->getHost()))
            && $connectPermitted;

        return [
            'enabled' => $enabled,
            'server' => $server,
            'domainId' => $domainId,
            'eventId' => $eventId,
            'allowLocalhost' => $allowLocalhost,
            'connectPermitted' => $connectPermitted,
        ];
    }

    /**
     * GraphQL endpoint Ackee would call from the browser (for CSP checks).
     */
    public static function resolveGraphqlUrl(string $server, Request $request): ?string
    {
        $server = self::sanitiseServer($server);
        if ($server === '') {
            return null;
        }

        if (str_starts_with($server, '/')) {
            $base = rtrim($server, '/') ?: '';

            return $request->getSchemeAndHttpHost().$base.'/api';
        }

        return rtrim($server, '/').'/api';
    }

    /**
     * Matches resources/js/scripts/analytics/ackee.js connect-src rules:
     * same-origin or https only (not http://another-host:port).
     */
    public static function isConnectSrcPermitted(string $server, Request $request): bool
    {
        $endpoint = self::resolveGraphqlUrl($server, $request);
        if ($endpoint === null || $endpoint === '') {
            return false;
        }

        $parts = parse_url($endpoint);
        if (! is_array($parts) || empty($parts['host'])) {
            return false;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? 'http'));
        $port = isset($parts['port']) ? (int) $parts['port'] : null;
        $host = strtolower((string) $parts['host']);

        $targetOrigin = $scheme.'://'.$host.($port !== null ? ':'.$port : '');
        $pageOrigin = $request->getSchemeAndHttpHost();

        if (strcasecmp($targetOrigin, $pageOrigin) === 0) {
            return true;
        }

        return $scheme === 'https';
    }

    public static function domainIdForHost(?string $host): string
    {
        $websiteId = self::sanitiseUuid((string) config('services.ackee.domain_id_website', ''));
        $appId = self::sanitiseUuid((string) config('services.ackee.domain_id_app', ''));

        if (MutqinDomains::isMarketingHost($host)) {
            return $websiteId;
        }

        if (MutqinDomains::isAppHost($host)) {
            return $appId !== '' ? $appId : $websiteId;
        }

        return $appId !== '' ? $appId : $websiteId;
    }

    public static function isLocalHost(?string $host): bool
    {
        $host = strtolower(trim((string) $host));
        $host = trim($host, '[]');
        if (str_starts_with($host, '::1')) {
            return true;
        }
        if (preg_match('/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/', $host) === 1) {
            return true;
        }

        return false;
    }

    public static function sanitiseServer(string $server): string
    {
        $server = rtrim(trim($server), '/');
        if ($server === '') {
            return '';
        }

        if (! preg_match('#^https://[a-z0-9.-]+(?::\d+)?$#i', $server)
            && ! preg_match('#^http://(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$#i', $server)
            && ! str_starts_with($server, '/')) {
            return '';
        }

        return $server;
    }

    public static function sanitiseUuid(string $value): string
    {
        $value = trim($value);

        return preg_match(self::UUID_PATTERN, $value) === 1 ? strtolower($value) : '';
    }
}
