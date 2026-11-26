<?php

namespace App\Http\Middleware;

use App\Support\PreviewSandbox;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block billing and checkout during labelled sandbox sessions.
 */
class BlockPreviewSandboxSideEffects
{
    /**
     * @var list<string>
     */
    private const BILLING_PATHS = [
        'checkout',
        'billing/checkout',
        'billing/success',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! PreviewSandbox::suppressesSideEffects($request)) {
            return $next($request);
        }

        $path = trim($request->path(), '/');
        foreach (self::BILLING_PATHS as $blocked) {
            if ($path === $blocked || str_starts_with($path, $blocked.'/')) {
                abort(404);
            }
        }

        return $next($request);
    }
}
