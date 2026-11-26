<?php

namespace App\Http\Middleware;

use App\Support\LandingPreviewAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Marketing preview routes return 404 unless the signed-in user is on the allowlist.
 */
class EnsureLandingPreviewAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! LandingPreviewAccess::enabled()) {
            abort(404);
        }

        LandingPreviewAccess::abortUnlessAllowedForRequest($request);

        return $next($request);
    }
}
