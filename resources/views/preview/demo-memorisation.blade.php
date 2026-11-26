@extends('layouts.app')

@push('head')
    <script>
        window.mutqinLandingPreview = true;
    </script>
@endpush

@section('content')
    @include('partials.preview-demo-banner')
    @php
        use App\Support\PreviewSandboxEntitlement;

        $memorisationUser = Auth::user();
        $displayTier = PreviewSandboxEntitlement::effectiveTier(request(), $memorisationUser);
        if ($memorisationUser) {
            $overlayPremium = PreviewSandboxEntitlement::hasPremiumAccess(request(), $memorisationUser);
            $overlayPro = PreviewSandboxEntitlement::hasProAccess(request(), $memorisationUser);
            $overlayPaid = PreviewSandboxEntitlement::hasPaidAccess(request(), $memorisationUser);
        } else {
            $overlayPremium = in_array($displayTier, ['premium', 'pro'], true);
            $overlayPro = $displayTier === 'pro';
            $overlayPaid = $overlayPremium;
        }
        $memorisationAuth = [
            'demo_mode' => true,
            'check' => Auth::check(),
            'id' => Auth::id(),
            'email' => $memorisationUser?->email,
            'name' => $memorisationUser?->name,
            'is_admin' => $memorisationUser?->showsAdminNavigation() ?? false,
            'session_voice_enabled' => \App\Support\SessionVoiceAccess::visible($memorisationUser),
            'session_voice_hints' => \App\Support\SessionVoiceAccess::visible($memorisationUser)
                ? app(\App\Services\AskMutqin\SessionVoiceInterpreter::class)->recognitionVocabulary(
                    str_starts_with((string) app()->getLocale(), 'ar') ? 'ar' : 'en'
                )
                : [],
            'admin_dashboard_url' => route('admin.dashboard'),
            'subscription_tier' => $displayTier,
            'subscription_status' => $memorisationUser?->subscription_status ?? 'free',
            'has_paid_access' => $overlayPaid,
            'has_premium_access' => $overlayPremium,
            'has_pro_access' => $overlayPro,
            'pricing_url' => route('pricing'),
            'dashboard_url' => route('dashboard'),
            'show_recommendation_plan' => (bool) config('mutqin.show_recommendation_plan', false),
            'locale' => Auth::user()?->locale ?? 'en',
            'theme' => Auth::check()
                ? \App\Support\Theme::normalizePreference($memorisationUser?->theme)
                : null,
            'ai_session_settings' => Auth::check()
                ? app(\App\Services\Auth\AiSessionSettingsService::class)->snapshot($memorisationUser)
                : null,
            'created_at' => Auth::user()?->created_at?->toIso8601String(),
            'onboarding_completed_at' => $memorisationUser?->onboarding_completed_at?->toIso8601String(),
            'login_event_id' => session('mutqin_login_event_id'),
            'just_registered' => false,
            'just_logged_in' => (bool) session('mutqin_just_logged_in', false),
            'show_tester_guide' => false,
            'app_url' => rtrim((string) config('app.url'), '/'),
            'csrf_token' => csrf_token(),
            'login_url' => route('login'),
            'google_login_url' => route('auth.google.redirect'),
            'register_url' => route('register'),
            'logout_url' => route('logout'),
            'forgot_password_url' => Route::has('password.request') ? route('password.request') : null,
            'login_error' => null,
            'google_error' => null,
            'old_email' => '',
            'old_remember' => false,
        ];
        $quranEditions = [
            'translation' => config('quran.translation'),
            'transliteration' => config('quran.transliteration'),
        ];
    @endphp
    <memorisation
        :auth='@json($memorisationAuth)'
        :quran-editions='@json($quranEditions)'
    ></memorisation>
@endsection