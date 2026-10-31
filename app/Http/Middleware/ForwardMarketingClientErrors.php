<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

/**
 * mutqin.ai is a separate Laravel Cloud app without the application database.
 * POST /api/client-errors there returns 500; forward ingest to the app host.
 */
class ForwardMarketingClientErrors
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->shouldForward($request)) {
            return $next($request);
        }

        $target = MutqinDomains::appUrl('/api/client-errors');

        try {
            $response = Http::timeout(8)
                ->acceptJson()
                ->withHeaders([
                    'X-Mutqin-Client-Error-Proxy' => '1',
                    'X-Request-Id' => (string) ($request->header('X-Request-Id') ?: ''),
                ])
                ->post($target, $request->all());
        } catch (\Throwable) {
            return response()->json(['recorded' => false], 202);
        }

        return response($response->body(), $response->status())
            ->header('Content-Type', 'application/json');
    }

    protected function shouldForward(Request $request): bool
    {
        if (app()->runningUnitTests()) {
            return false;
        }

        if ($request->headers->get('X-Mutqin-Client-Error-Proxy') === '1') {
            return false;
        }

        if (! MutqinDomains::isMarketingHost($request->getHost())) {
            return false;
        }

        return MutqinDomains::marketingHost() !== MutqinDomains::appHost();
    }
}
