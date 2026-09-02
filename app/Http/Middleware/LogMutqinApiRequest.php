<?php

namespace App\Http\Middleware;

use App\Support\ErrorReporting;
use App\Support\MutqinLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogMutqinApiRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $started = microtime(true);
        $requestId = ErrorReporting::requestId($request) ?: ErrorReporting::newRequestId();
        $request->attributes->set('mutqin.request_id', $requestId);

        /** @var Response $response */
        $response = $next($request);

        if ($request->is('api/client-errors')) {
            $response->headers->set('X-Request-Id', $requestId);

            return $response;
        }

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
