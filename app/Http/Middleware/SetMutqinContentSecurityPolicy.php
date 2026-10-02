<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * App shell needs same-origin + known CDN scripts/styles. Some embedded previews
 * ship a broken {@code script-src 'none'} policy — replace it for HTML only.
 */
class SetMutqinContentSecurityPolicy
{
    private const POLICY = "default-src 'self'; "
        ."base-uri 'self'; "
        ."form-action 'self'; "
        ."frame-ancestors 'none'; "
        ."object-src 'none'; "
        ."script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; "
        ."style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        ."font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com https://fonts.bunny.net; "
        ."img-src 'self' data: blob: https:; "
        ."media-src 'self' blob: https:; "
        ."connect-src 'self' https: wss:; "
        ."worker-src 'self' blob:; "
        ."manifest-src 'self';";

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (! $this->isHtmlDocument($request, $response)) {
            return $response;
        }

        $existing = strtolower((string) $response->headers->get('Content-Security-Policy', ''));
        if ($existing === '' || ! str_contains($existing, "script-src 'none'")) {
            return $response;
        }

        $response->headers->set('Content-Security-Policy', self::POLICY);

        return $response;
    }

    private function isHtmlDocument(Request $request, Response $response): bool
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return false;
        }

        $contentType = strtolower((string) $response->headers->get('Content-Type', ''));
        if ($contentType !== '' && ! str_contains($contentType, 'text/html')) {
            return false;
        }

        return $request->isMethod('GET') || $request->isMethod('HEAD');
    }
}
