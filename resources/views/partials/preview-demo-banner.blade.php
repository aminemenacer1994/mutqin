@php
    use App\Support\LandingPreviewAccess;
    use App\Support\LandingPreviewDemo;
    use App\Support\PreviewSandbox;
    use App\Support\PreviewSandboxEntitlement;
    use App\Services\Preview\PreviewSandboxCatalogRestore;

    $demoPayload = $demoPayload ?? session(LandingPreviewDemo::SESSION_KEY);
@endphp
@if (LandingPreviewAccess::enabled() && is_array($demoPayload))
    @php
        $sandbox = PreviewSandbox::resolveSession(request());
        $activePersonaId = (string) ($demoPayload['persona'] ?? '');
        $activePersona = LandingPreviewDemo::persona($activePersonaId);
        $classroomKey = $sandbox?->classroom_key ?? ($activePersona['classroom_key'] ?? null);
        $switchable = array_map(
            static fn (array $persona): array => [
                'id' => $persona['id'],
                'title' => $persona['title'],
            ],
            LandingPreviewDemo::switchablePersonas(is_string($classroomKey) ? $classroomKey : null)
        );
        $expiresInMinutes = null;
        if ($sandbox !== null && $sandbox->expires_at !== null) {
            $expiresInMinutes = (int) now()->diffInMinutes($sandbox->expires_at, false);
            if ($expiresInMinutes < 0) {
                $expiresInMinutes = 0;
            }
        }
        $entitlementOverlay = PreviewSandboxEntitlement::overlayApplies(request(), auth()->user());
        $conversionExperience = is_array($activePersona)
            ? (string) ($activePersona['experience'] ?? 'personal')
            : 'personal';
        $toolbarConfig = [
            'activePersona' => $activePersonaId,
            'activeRole' => $activePersona['role'] ?? 'teacher',
            'conversionExperience' => $conversionExperience,
            'activeLabel' => $demoPayload['label'] ?? __('preview_demo.banner.generic'),
            'guided' => (bool) session(LandingPreviewDemo::GUIDED_SESSION_KEY, false),
            'expiresInMinutes' => $expiresInMinutes,
            'switchable' => $switchable,
            'csrfToken' => csrf_token(),
            'switchUrl' => route('preview.demo.switch'),
            'guidedUrl' => route('preview.demo.guided'),
            'restartUrl' => route('preview.demo.walkthrough.restart'),
            'resetUrl' => route('preview.demo.reset'),
            'entitlementUrl' => route('preview.demo.entitlement'),
            'exitUrl' => route('preview.demo.exit'),
            'getStartedUrl' => route('register'),
            'registerUrl' => route('register'),
            'pricingUrl' => route('preview.pricing'),
            'previewHomeUrl' => route('preview.home'),
            'demoHubUrl' => route('preview.demo'),
            'walkthroughReset' => session()->pull('sandbox_walkthrough_reset') === true,
            'walkthroughId' => (string) session(
                LandingPreviewDemo::WALKTHROUGH_ID_SESSION_KEY,
                $activePersona['experience'] ?? ''
            ),
            'canRestoreCatalog' => $sandbox !== null && app(PreviewSandboxCatalogRestore::class)->canRestore($sandbox),
            'entitlementOverlay' => $entitlementOverlay,
            'entitlementTier' => PreviewSandboxEntitlement::sessionTier(request()) ?? PreviewSandboxEntitlement::DEFAULT_TIER,
        ];
        $walkthroughConfig = [
            'guided' => (bool) session(LandingPreviewDemo::GUIDED_SESSION_KEY, false),
            'activePersona' => $activePersonaId,
            'walkthroughId' => $toolbarConfig['walkthroughId'],
            'walkthroughReset' => $toolbarConfig['walkthroughReset'],
        ];
    @endphp
    <preview-sandbox-toolbar :config='@json($toolbarConfig)'></preview-sandbox-toolbar>
    @if ($walkthroughConfig['guided'])
        <preview-sandbox-walkthrough :config='@json($walkthroughConfig)'></preview-sandbox-walkthrough>
    @endif
@endif