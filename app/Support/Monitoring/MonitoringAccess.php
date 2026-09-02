<?php

namespace App\Support\Monitoring;

use App\Models\User;
use Illuminate\Http\Request;

class MonitoringAccess
{
    /**
     * Internal monitoring routes: non-production open; production requires
     * verified admin or MONITORING_INTERNAL_TOKEN. Disabled when probe_enabled=false.
     */
    public static function internalAllowed(?Request $request = null): bool
    {
        if (! config('monitoring.probe_enabled', true)) {
            return false;
        }

        if (! app()->environment('production')) {
            return true;
        }

        $request ??= request();

        if (self::tokenMatches($request)) {
            return true;
        }

        $user = $request?->user();

        return $user instanceof User && $user->isAdmin();
    }

    /**
     * Staging alert probe — never available in production.
     */
    public static function alertProbeAllowed(?Request $request = null): bool
    {
        if (! config('monitoring.probe_enabled', true)) {
            return false;
        }

        if (app()->environment('production')) {
            return false;
        }

        $request ??= request();

        // Still accept a token in staging so CI / monitors can call without a session.
        if (self::configuredToken() !== '' && ! self::tokenMatches($request)) {
            // Token configured but wrong/missing: deny to avoid accidental public probes.
            return false;
        }

        return true;
    }

    public static function tokenMatches(?Request $request): bool
    {
        $expected = self::configuredToken();
        if ($expected === '' || ! $request) {
            return false;
        }

        $provided = self::providedToken($request);
        if ($provided === '') {
            return false;
        }

        return hash_equals($expected, $provided);
    }

    private static function configuredToken(): string
    {
        return trim((string) config('monitoring.internal_token', ''));
    }

    private static function providedToken(Request $request): string
    {
        $header = trim((string) $request->header('X-Mutqin-Monitoring-Token', ''));
        if ($header !== '') {
            return $header;
        }

        $auth = trim((string) $request->header('Authorization', ''));
        if (str_starts_with(strtolower($auth), 'bearer ')) {
            return trim(substr($auth, 7));
        }

        return '';
    }
}
