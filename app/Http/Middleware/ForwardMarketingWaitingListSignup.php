<?php

namespace App\Http\Middleware;

use App\Support\MutqinDomains;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

/**
 * mutqin.ai is a separate Cloud app. Its database is not the signup store,
 * and POST /join-waiting-list there returns 500. Forward the body to the app host.
 */
class ForwardMarketingWaitingListSignup
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->shouldForward($request)) {
            return $next($request);
        }

        $target = MutqinDomains::appUrl('/join-waiting-list');

        try {
            $response = Http::timeout(12)
                ->acceptJson()
                ->withHeaders([
                    'X-Mutqin-Waiting-List-Proxy' => '1',
                ])
                ->post($target, [
                    'name' => $request->input('name'),
                    'email' => $request->input('email'),
                ]);
        } catch (\Throwable) {
            return response()->json([
                'message' => __('ui.waiting_list_unavailable'),
            ], 503);
        }

        return response($response->body(), $response->status())
            ->header('Content-Type', 'application/json');
    }

    private function shouldForward(Request $request): bool
    {
        if (app()->runningUnitTests()) {
            return false;
        }

        if ($request->headers->get('X-Mutqin-Waiting-List-Proxy') === '1') {
            return false;
        }

        if (! MutqinDomains::isMarketingHost($request->getHost())) {
            return false;
        }

        return MutqinDomains::marketingHost() !== MutqinDomains::appHost();
    }
}
