<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * mutqin.ai is the only public host. The waiting-list page is closed.
 * app.mutqin.ai GET/HEAD requests move to the same path on mutqin.ai.
 */
class EnforceMarketingHostPolicy
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = '/'.ltrim($request->path(), '/');
        if ($path === '//') {
            $path = '/';
        }

        $lower = strtolower($path);
        $isWaitingList = $lower === '/waiting-list' || str_starts_with($lower, '/waiting-list/');
        $isUnsubscribe = str_starts_with($lower, '/waiting-list/unsubscribe');
        if ($isWaitingList && ! $isUnsubscribe) {
            return redirect()->to(MutqinDomains::canonicalUrl('/'));
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
