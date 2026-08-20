<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionTier
{
    /**
     * Previously gated premium/pro features. All features are free.
     *
     * @param  'premium'|'pro'  $tier
     */
    public function handle(Request $request, Closure $next, string $tier = 'premium'): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        void $tier;

        return $next($request);
    }
}
