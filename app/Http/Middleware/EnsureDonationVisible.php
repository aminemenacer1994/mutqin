<?php

namespace App\Http\Middleware;

use App\Support\DonationVisibility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDonationVisible
{
    public function handle(Request $request, Closure $next): Response
    {
        DonationVisibility::abortUnlessEnabled();

        return $next($request);
    }
}
