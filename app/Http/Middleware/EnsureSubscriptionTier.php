<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionTier
{
    /**
     * Gate premium/pro features against the authenticated user's paid tier.
     * Admins receive Pro via User::effectiveSubscriptionTier().
     *
     * @param  'premium'|'pro'  $tier
     */
    public function handle(Request $request, Closure $next, string $tier = 'premium'): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $allowed = match ($tier) {
            'pro' => $user->hasProAccess(),
            default => $user->hasPremiumAccess(),
        };

        if (! $allowed) {
            abort(403, __('billing.plan_required', ['tier' => $tier]));
        }

        return $next($request);
    }
}
