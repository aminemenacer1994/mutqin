<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * mutqin.ai is waiting-list only. Enforced from the request Host so it still
 * applies when APP_URL points at the marketing domain and Route::domain groups
 * are not registered.
 */
class EnforceMarketingHostPolicy
{
    private const WAITING_LIST = '/waiting-list';

    public function handle(Request $request, Closure $next): Response
    {
        if (! MutqinDomains::restrictMarketingHost($request)) {
            return $next($request);
        }

        if ($request->is('api/*')) {
            return $next($request);
        }

        $path = '/'.ltrim($request->path(), '/');
        if ($path === '/' || $path === '//') {
            return redirect(self::WAITING_LIST);
        }

        if (strtolower($path) === self::WAITING_LIST) {
            return $next($request);
        }

        $target = MutqinDomains::appUrl($path);
        $query = $request->getQueryString();
        if (is_string($query) && $query !== '') {
            $target .= '?'.$query;
        }

        return redirect()->away($target);
    }
}
