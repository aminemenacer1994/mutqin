<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Preview\PreviewSandboxCatalogRestore;
use App\Services\Preview\PreviewSandboxService;
use App\Support\LandingPreviewAccess;
use App\Support\LandingPreviewDemo;
use App\Support\PreviewSandbox;
use App\Support\PreviewSandboxCapabilities;
use App\Support\PreviewSandboxEntitlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class LandingPreviewDemoController extends Controller
{
    public function __construct(
        private PreviewSandboxService $sandboxes,
        private PreviewSandboxCatalogRestore $catalogRestore,
    ) {}

    public function status(): JsonResponse
    {
        $rows = [];
        foreach (LandingPreviewDemo::personas() as $persona) {
            $ready = true;
            if ($persona['requires_login'] && $persona['email'] !== null) {
                $ready = LandingPreviewDemo::resolveDemoUser($persona['id']) !== null;
            }

            $rows[] = [
                'id' => $persona['id'],
                'experience' => $persona['experience'] ?? '',
                'ready' => $ready,
                'requires_login' => $persona['requires_login'],
                'classroom_key' => $persona['classroom_key'],
                'preview_asset' => $persona['preview_asset'] ?? '',
            ];
        }

        $experiences = [];
        foreach (LandingPreviewDemo::experiences() as $row) {
            $personaId = LandingPreviewDemo::resolveExperiencePersonaId($row['experience']);
            $experiences[] = [
                'experience' => $row['experience'],
                'persona_id' => $personaId,
                'ready' => $personaId !== null,
                'preview_asset' => $row['preview_asset'],
            ];
        }

        return response()->json(['personas' => $rows, 'experiences' => $experiences])
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    public function capabilities(): JsonResponse
    {
        $sandbox = PreviewSandbox::resolveSession(request());
        $canRestore = $sandbox !== null && $this->catalogRestore->canRestore($sandbox);

        return response()->json([
            'capabilities' => PreviewSandboxCapabilities::report(),
            'entitlement_tier' => PreviewSandboxEntitlement::sessionTier(request()),
            'entitlement_overlay' => PreviewSandboxEntitlement::overlayApplies(request(), request()->user()),
            'can_restore_catalog' => $canRestore,
        ])
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    public function setEntitlement(Request $request): RedirectResponse
    {
        if (! $request->session()->has(LandingPreviewDemo::SESSION_KEY)) {
            abort(404);
        }

        $this->assertHubAccess($request);

        $validated = $request->validate([
            'tier' => 'required|string|in:free,premium,pro',
        ]);

        PreviewSandboxEntitlement::setSessionTier($request, (string) $validated['tier']);

        return redirect()->back()->with('status', 'Demonstration tier updated. Your account subscription was not changed.');
    }

    public function enter(Request $request): RedirectResponse
    {
        $this->assertHubAccess($request);

        $validated = $request->validate([
            'persona' => 'required_without:experience|nullable|string|max:64',
            'experience' => 'required_without:persona|nullable|string|max:32',
            'guided' => 'nullable|boolean',
            'embed' => 'nullable|boolean',
        ]);

        $personaId = (string) ($validated['persona'] ?? '');
        if ($personaId === '' && isset($validated['experience'])) {
            $resolved = LandingPreviewDemo::resolveExperiencePersonaId((string) $validated['experience']);
            $personaId = $resolved ?? '';
        }

        if ($personaId === '') {
            abort(422, 'Persona or experience is required.');
        }

        $guided = $request->boolean('guided');
        $request->session()->put(LandingPreviewDemo::GUIDED_SESSION_KEY, $guided);

        $persona = LandingPreviewDemo::persona($personaId);

        if ($persona === null) {
            abort(404);
        }

        $experience = (string) ($validated['experience'] ?? ($persona['experience'] ?? ''));
        $walkthroughId = LandingPreviewDemo::resolveWalkthroughId($experience, $guided, $persona);
        if ($guided && $walkthroughId !== '') {
            $request->session()->put(LandingPreviewDemo::WALKTHROUGH_ID_SESSION_KEY, $walkthroughId);
        } else {
            $request->session()->forget(LandingPreviewDemo::WALKTHROUGH_ID_SESSION_KEY);
        }

        $owner = $this->resolvePreviewOwner($request);
        if (! $owner instanceof User) {
            abort(403);
        }

        $sandbox = $this->sandboxes->resumeOrStartForOwner(
            $owner,
            PreviewSandbox::sessionId($request)
        );
        $this->sandboxes->assertPersonaAllowed($sandbox, $persona);

        if ($persona['requires_login'] !== true) {
            PreviewSandbox::bindHttpSession($request, $sandbox, $owner);
            $this->sandboxes->recordPersona($sandbox, $personaId);
            $this->restorePreviewOwnerLogin($request, $owner);
            $request->session()->put(
                LandingPreviewDemo::SESSION_KEY,
                LandingPreviewDemo::sessionPayload($personaId, $sandbox->id)
            );

            return redirect($this->demoRedirect($persona['redirect'], $request));
        }

        $demoUser = LandingPreviewDemo::resolveDemoUser($personaId);
        if ($demoUser === null) {
            return redirect()
                ->route('preview.demo')
                ->with('preview_demo_error', 'Demo data is not seeded yet. Run php artisan mutqin:seed-organisation-network or mutqin:seed-platform-demo locally.');
        }

        PreviewSandbox::bindHttpSession($request, $sandbox, $owner);
        $this->sandboxes->recordPersona($sandbox, $personaId);
        $this->sandboxes->assertDemoUserBelongsToSandbox($sandbox, $demoUser, $personaId);

        Auth::login($demoUser, true);
        $request->session()->regenerate();
        PreviewSandbox::bindHttpSession($request, $sandbox, $owner);
        $request->session()->put(
            LandingPreviewDemo::SESSION_KEY,
            LandingPreviewDemo::sessionPayload($personaId, $sandbox->id)
        );
        $request->session()->put('mutqin_login_event_id', (string) Str::uuid());
        $request->session()->put('mutqin_login_method', 'preview_demo');
        $request->session()->put('mutqin_just_logged_in', true);
        $request->session()->forget('url.intended');

        return redirect($this->demoRedirect($persona['redirect'], $request));
    }

    public function switch(Request $request): RedirectResponse
    {
        return $this->enter($request);
    }

    public function toggleGuided(Request $request): RedirectResponse
    {
        if (! $request->session()->has(LandingPreviewDemo::SESSION_KEY)) {
            abort(404);
        }

        $this->assertHubAccess($request);

        $enabled = ! (bool) $request->session()->get(LandingPreviewDemo::GUIDED_SESSION_KEY, false);
        $request->session()->put(LandingPreviewDemo::GUIDED_SESSION_KEY, $enabled);

        return redirect()->back();
    }

    public function restartWalkthrough(Request $request): RedirectResponse
    {
        if (! $request->session()->has(LandingPreviewDemo::SESSION_KEY)) {
            abort(404);
        }

        $this->assertHubAccess($request);
        $request->session()->put(LandingPreviewDemo::GUIDED_SESSION_KEY, true);

        return redirect()->back()->with('sandbox_walkthrough_reset', true);
    }

    public function reset(Request $request): RedirectResponse
    {
        $sandbox = PreviewSandbox::resolveSession($request);
        if ($sandbox === null) {
            abort(404);
        }

        $this->assertHubAccess($request);

        $validated = $request->validate([
            'restore_catalog' => 'nullable|boolean',
            'confirm' => 'required|accepted',
        ]);

        if ($request->boolean('restore_catalog') && $this->catalogRestore->canRestore($sandbox)) {
            $this->catalogRestore->restoreForSession($sandbox);
        } else {
            $this->sandboxes->manualReset($sandbox);
        }

        PreviewSandboxEntitlement::clearSessionTier($request);
        $request->session()->forget(LandingPreviewDemo::GUIDED_SESSION_KEY);

        return redirect()
            ->route('preview.demo')
            ->with('status', $request->boolean('restore_catalog')
                ? 'Sandbox reset complete. Synthetic classroom data was restored from seeders.'
                : 'Sandbox session reset. Timers and quotas were cleared; seed data was not changed.');
    }

    public function exit(Request $request): RedirectResponse
    {
        if (! $request->session()->has(LandingPreviewDemo::SESSION_KEY)) {
            abort(404);
        }

        $validated = $request->validate([
            'destination' => 'nullable|string|in:hub,landing,pricing',
        ]);
        $destination = (string) ($validated['destination'] ?? 'hub');

        $ownerId = PreviewSandbox::ownerUserId($request);
        $owner = $ownerId ? User::query()->find($ownerId) : null;

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($owner instanceof User && LandingPreviewAccess::allowed($owner)) {
            Auth::login($owner, true);
            $request->session()->regenerate();

            $route = match ($destination) {
                'landing' => route('preview.home'),
                'pricing' => route('preview.pricing'),
                default => route('preview.demo'),
            };

            $message = match ($destination) {
                'landing' => 'Demo ended. You are back on the preview landing page.',
                'pricing' => 'Demo ended. Compare plans on your preview session.',
                default => 'Demo ended. You are back on your preview allowlist session.',
            };

            return redirect()->to($route)->with('status', $message);
        }

        return redirect()->route('login')->with('status', 'Demo ended. Sign in with your preview allowlist account to return to /preview.');
    }

    private function assertHubAccess(Request $request): void
    {
        if (PreviewSandbox::publicAccessEnabled()) {
            return;
        }

        LandingPreviewAccess::abortUnlessAllowedForRequest($request);
    }

    private function restorePreviewOwnerLogin(Request $request, User $owner): void
    {
        $current = $request->user();
        if ($current instanceof User && LandingPreviewDemo::isSyntheticDemoUser($current)) {
            Auth::login($owner, true);
        }
    }

    private function resolvePreviewOwner(Request $request): ?User
    {
        $user = $request->user();
        if ($user instanceof User && LandingPreviewAccess::allowed($user)) {
            return $user;
        }

        $ownerId = PreviewSandbox::ownerUserId($request);
        if ($ownerId !== null) {
            $owner = User::query()->find($ownerId);
            if ($owner instanceof User && LandingPreviewAccess::allowed($owner)) {
                return $owner;
            }
        }

        return null;
    }

    private function demoRedirect(string $path, Request $request): string
    {
        if (! $request->boolean('embed')) {
            return $path;
        }

        return str_contains($path, '?')
            ? $path.'&mutqin_embed=1'
            : $path.'?mutqin_embed=1';
    }
}
