<?php

namespace App\Http\Middleware;

use App\Support\Seo\SeoCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mirror HTML robots meta with X-Robots-Tag so intermediaries see the same policy.
 */
class ApplySeoRobotsHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if ($request->is('robots.txt') || $request->is('sitemap.xml')) {
            return $response;
        }

        $contentType = strtolower((string) $response->headers->get('Content-Type', ''));
        if ($contentType !== '' && ! str_contains($contentType, 'text/html')) {
            return $response;
        }

        if ($contentType === '' && ($request->is('api/*') || $request->expectsJson())) {
            return $response;
        }

        $seo = SeoCatalog::forRequest($request);
        $response->headers->set('X-Robots-Tag', $seo->robots);

        return $response;
    }
}
