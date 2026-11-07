<?php

namespace App\Http\Middleware;

use App\Support\ArticlesVisibility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureArticlesVisible
{
    public function handle(Request $request, Closure $next): Response
    {
        ArticlesVisibility::abortUnlessEnabled();

        return $next($request);
    }
}
