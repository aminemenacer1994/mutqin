<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\LandingPreviewDemo;
use App\Support\PreviewSandbox;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Synthetic demo accounts must match an active preview sandbox session (Group J1).
 */
class EnsureActivePreviewSandbox
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! PreviewSandbox::enabled()) {
            return $next($request);
        }

        $user = $request->user();
        if (! $user instanceof User || ! LandingPreviewDemo::isSyntheticDemoUser($user)) {
            return $next($request);
        }

        $session = PreviewSandbox::resolveSession($request);
        if ($session === null) {
            $owner = PreviewSandbox::ejectSyntheticDemo($request);

            if ($owner !== null) {
                return redirect()
                    ->route('preview.demo')
                    ->with(
                        'preview_demo_error',
                        'Your preview sandbox session expired or was interrupted. Start a new demo from the hub.'
                    );
            }

            Auth::logout();

            return redirect()
                ->route('login')
                ->with('status', 'The preview demo session ended. Sign in with your preview allowlist account to continue.');
        }

        $session->touchActivity();

        $expectedEmail = strtolower((string) $user->email);
        $personaId = (string) ($session->active_persona ?? '');
        $persona = LandingPreviewDemo::persona($personaId);
        if ($persona !== null) {
            $personaEmail = strtolower((string) ($persona['email'] ?? ''));
            if ($personaEmail !== '' && $personaEmail !== $expectedEmail) {
                Auth::logout();
                abort(403, 'Sandbox identity mismatch.');
            }
        }

        return $next($request);
    }
}
