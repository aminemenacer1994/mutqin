<?php

namespace App\Http\Middleware;

use App\Support\ErrorReporting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $incoming = $request->headers->get('X-Request-Id');
        $requestId = ErrorReporting::isValidRequestId($incoming)
            ? $incoming
            : ErrorReporting::newRequestId();

        $request->attributes->set('mutqin.request_id', $requestId);
        $request->headers->set('X-Request-Id', $requestId);

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
