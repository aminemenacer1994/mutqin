<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionTier
{
    /**
     * @param  'premium'|'pro'  $tier
     */
    public function handle(Request $request, Closure $next, string $tier = 'premium'): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        $allowed = match ($tier) {
            'pro' => $user->hasProAccess(),
            'premium' => $user->hasPremiumAccess(),
            default => false,
        };

        if (!$allowed) {
            return response()->json([
                'message' => __('ui.subscription_upgrade_required'),
                'required_tier' => $tier,
                'upgrade_url' => route('pricing'),
            ], 403);
        }

        return $next($request);
    }
}
