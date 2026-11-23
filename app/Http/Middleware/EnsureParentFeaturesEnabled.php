<?php

namespace App\Http\Middleware;

use App\Support\ParentFeatures;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureParentFeaturesEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        ParentFeatures::abortUnlessEnabled();

        return $next($request);
    }
}
