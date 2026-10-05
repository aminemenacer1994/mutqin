<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirect www.* production hosts to the apex marketing or app host.
 */
class RedirectWwwHost
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return $next($request);
        }

        $host = strtolower((string) $request->getHost());
        if (! str_starts_with($host, 'www.')) {
            return $next($request);
        }

        $apex = substr($host, 4);
        $marketing = MutqinDomains::marketingHost();
        $app = MutqinDomains::appHost();
        if ($apex !== $marketing && $apex !== $app) {
            return $next($request);
        }

        $target = $request->getScheme().'://'.$apex.$request->getRequestUri();

        return redirect()->away($target, 301);
    }
}
