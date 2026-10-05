<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Collapse trailing slashes onto the slash-free canonical path (except "/").
 */
class RedirectTrailingSlash
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return $next($request);
        }

        $path = parse_url($request->getRequestUri(), PHP_URL_PATH) ?: '/';
        if ($path === '/' || $path === '' || ! str_ends_with($path, '/')) {
            return $next($request);
        }

        $target = $request->getSchemeAndHttpHost().rtrim($path, '/');
        $query = $request->getQueryString();
        if (is_string($query) && $query !== '') {
            $target .= '?'.$query;
        }

        return redirect()->away($target, 301);
    }
}
