<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keep local dev on the same host as APP_URL (localhost vs 127.0.0.1).
 * Mixed hosts break sessions, CSRF, and lazy Mix chunks that load from the page origin.
 */
class NormalizeLocalDevelopmentHost
{
    private const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->environment('local')) {
            return $next($request);
        }

        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return $next($request);
        }

        $currentHost = strtolower((string) $request->getHost());
        if (! in_array($currentHost, self::LOCAL_HOSTS, true)) {
            return $next($request);
        }

        $parts = parse_url((string) config('app.url'));
        $targetHost = strtolower((string) ($parts['host'] ?? ''));
        if ($targetHost === '' || ! in_array($targetHost, self::LOCAL_HOSTS, true)) {
            return $next($request);
        }

        if ($currentHost === $targetHost) {
            return $next($request);
        }

        $scheme = (string) ($parts['scheme'] ?? $request->getScheme());
        $port = isset($parts['port']) ? (int) $parts['port'] : (int) $request->getPort();
        $authority = $port > 0 && ! in_array($port, [80, 443], true)
            ? "{$targetHost}:{$port}"
            : $targetHost;

        $target = "{$scheme}://{$authority}{$request->getRequestUri()}";

        return redirect()->away($target, 307);
    }
}
