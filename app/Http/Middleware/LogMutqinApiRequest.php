<?php

namespace App\Http\Middleware;

use App\Support\MutqinLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class LogMutqinApiRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $started = microtime(true);
        $requestId = $request->headers->get('X-Request-Id') ?: (string) Str::uuid();
        $request->attributes->set('mutqin.request_id', $requestId);

        /** @var Response $response */
        $response = $next($request);

        MutqinLog::info('api.request.completed', array_merge(
            MutqinLog::requestContext($request),
            [
                'status' => $response->getStatusCode(),
                'duration_ms' => (int) round((microtime(true) - $started) * 1000),
            ]
        ));

        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
