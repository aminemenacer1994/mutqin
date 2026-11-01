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
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (! $this->isHtmlDocument($request, $response)) {
            return $response;
        }

        $existing = strtolower((string) $response->headers->get('Content-Security-Policy', ''));

        // Always ship the Mutqin shell policy on HTML. Embedded previews and some
        // proxies inject script-src 'none'; leaving that header in place (or
        // combining policies) blocks app.js and every inline boot script.
        if ($existing !== '' && ! $this->shouldReplacePolicy($existing)) {
            return $response;
        }

        $response->headers->remove('Content-Security-Policy-Report-Only');
        $response->headers->set('Content-Security-Policy', self::buildPolicy());

        return $response;
    }

    private function shouldReplacePolicy(string $existing): bool
    {
        if ($existing === '') {
            return true;
        }

        if (str_contains($existing, "script-src 'none'")) {
            return true;
        }

        // Broken or foreign policies that omit same-origin scripts.
        if (! str_contains($existing, "'self'")) {
            return true;
        }

        return false;
    }

    public static function buildPolicy(): string
    {
        $scriptSrc = "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com";
        if (! app()->isProduction() || config('app.debug')) {
            // Webpack watch/dev lazy chunks and some tooling still rely on eval.
            $scriptSrc .= " 'unsafe-eval'";
        }

        return "default-src 'self'; "
            ."base-uri 'self'; "
            ."form-action 'self'; "
            ."frame-ancestors 'none'; "
            ."object-src 'none'; "
            ."script-src {$scriptSrc}; "
            ."style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.bunny.net; "
            ."font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com https://fonts.bunny.net https://verses.quran.foundation; "
            ."img-src 'self' data: blob: https:; "
            ."media-src 'self' blob: data: https:; "
            ."connect-src 'self' https: wss:; "
            ."worker-src 'self' blob:; "
            ."manifest-src 'self';";
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
