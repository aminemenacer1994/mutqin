<?php

namespace App\Http\Middleware;

use App\Support\HowItWorksVisibility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHowItWorksVisible
{
    public function handle(Request $request, Closure $next): Response
    {
        HowItWorksVisibility::abortUnlessEnabled();

        return $next($request);
    }
}
