@extends('layouts.app')

@section('content')
    @php
        $memorisationUser = Auth::user();
        $memorisationAuth = [
            'demo_mode' => !empty($demoMode) && !Auth::check(),
            'check' => Auth::check(),
            'id' => Auth::id(),
            'email' => $memorisationUser?->email,
            'name' => $memorisationUser?->name,
            'is_admin' => $memorisationUser?->isAdmin() ?? false,
            'admin_dashboard_url' => route('admin.dashboard'),
            'subscription_tier' => Auth::user()?->effectiveSubscriptionTier() ?? 'free',
            'subscription_status' => Auth::user()?->subscription_status ?? 'free',
            'has_paid_access' => Auth::user()?->hasPaidAccess() ?? false,
            'has_premium_access' => Auth::user()?->hasPremiumAccess() ?? false,
            'has_pro_access' => Auth::user()?->hasProAccess() ?? false,
            'pricing_url' => route('pricing'),
            'locale' => Auth::user()?->locale ?? 'en',
            'ai_recall_mode_enabled' => Auth::user()?->ai_recall_mode_enabled ?? false,
            'created_at' => Auth::user()?->created_at?->toIso8601String(),
            'login_event_id' => session('mutqin_login_event_id'),
            'just_registered' => !empty($justRegistered),
            'just_logged_in' => session('mutqin_just_logged_in', false),
            'csrf_token' => csrf_token(),
            'login_url' => route('login'),
            'google_login_url' => route('auth.google.redirect'),
            'register_url' => route('register'),
            'logout_url' => route('logout'),
            'forgot_password_url' => Route::has('password.request') ? route('password.request') : null,
            'login_error' => $errors->first('email') ?: $errors->first('password'),
            'google_error' => $errors->first('google'),
            'old_email' => old('email'),
            'old_remember' => old('remember') ? true : false,
        ];
    @endphp

    @php
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
