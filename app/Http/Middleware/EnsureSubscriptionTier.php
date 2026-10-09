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

        // Local/staging testers: demo login is on, so paid gates stay open.
        // Demo login is an explicit host flag (SHOW_DEMO_ACCOUNTS).
        if (config('app.show_demo_accounts')) {
            return $next($request);
        }

        $allowed = match ($tier) {
            'pro' => $user->hasProAccess(),
            default => $user->hasPremiumAccess(),
        };

        if (! $allowed) {
            $message = __('billing.plan_required', ['tier' => $tier]);

            // JSON clients (Find by voice, AI Recite token mint) need a stable reason
            // code — a bare abort(403) was mislabeled as a network/voice failure.
            if ($request->expectsJson() || $request->ajax() || $request->wantsJson()) {
                return response()->json([
                    'available' => false,
                    'reason' => 'plan_required',
                    'message' => $message,
                    'tier' => $tier,
                ], 403);
            }

            abort(403, $message);
        }

        return $next($request);
    }
}
