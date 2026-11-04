<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * mutqin.ai is the public host. When app and marketing hosts differ in config,
 * GET/HEAD on the non-canonical host move to the same path on mutqin.ai.
 */
class EnforceMarketingHostPolicy
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = '/'.ltrim($request->path(), '/');
        if ($path === '//') {
            $path = '/';
        }

        if ($this->shouldRedirectAppHost($request)) {
            $target = MutqinDomains::canonicalUrl($path);
            $query = $request->getQueryString();
            if (is_string($query) && $query !== '') {
                $target .= '?'.$query;
            }

            return redirect()->away($target, 301);
        }

        return $next($request);
    }

    private function shouldRedirectAppHost(Request $request): bool
    {
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return false;
        }

        if (! MutqinDomains::canonicalizePublicHost()) {
            return false;
        }

        return MutqinDomains::isAppHost($request->getHost());
    }
}
