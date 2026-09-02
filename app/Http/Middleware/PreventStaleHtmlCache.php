<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * HTML documents must revalidate so browsers never keep a shell that
 * references deleted Mix chunks after a deploy.
 */
class PreventStaleHtmlCache
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $contentType = (string) $response->headers->get('Content-Type', '');
        if ($contentType !== '' && ! str_contains(strtolower($contentType), 'text/html')) {
            return $response;
        }

        // Only treat document navigations / blade views as HTML when Content-Type is unset.
        if ($contentType === '' && ! $this->looksLikeHtmlDocument($request, $response)) {
            return $response;
        }

        $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');
        $response->headers->remove('ETag');

        return $response;
    }

    private function looksLikeHtmlDocument(Request $request, Response $response): bool
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return false;
        }

        $disposition = (string) $response->headers->get('Content-Disposition', '');
        if ($disposition !== '' && stripos($disposition, 'attachment') !== false) {
            return false;
        }

        return $request->isMethod('GET') || $request->isMethod('HEAD');
    }
}
