@extends('layouts.app')

@section('content')
    @php
        $memorisationAuth = [
            'check' => Auth::check(),
            'id' => Auth::id(),
            'email' => Auth::user()?->email,
            'name' => Auth::user()?->name,
            'subscription_tier' => Auth::user()?->subscription_tier ?? 'free',
            'subscription_status' => Auth::user()?->subscription_status ?? 'free',
            'has_paid_access' => Auth::user()?->hasPaidAccess() ?? false,
            'locale' => Auth::user()?->locale ?? 'en',
            'ai_recall_mode_enabled' => Auth::user()?->ai_recall_mode_enabled ?? false,
            'created_at' => Auth::user()?->created_at?->toIso8601String(),
            'just_registered' => session('mutqin_just_registered', false),
            'just_logged_in' => session('mutqin_just_logged_in', false),
            'csrf_token' => csrf_token(),
            'login_url' => route('login'),
            'google_login_url' => route('auth.google.redirect'),
            'register_url' => route('register'),
            'forgot_password_url' => Route::has('password.request') ? route('password.request') : null,
            'login_error' => $errors->first('email') ?: $errors->first('password'),
            'google_error' => $errors->first('google'),
            'old_email' => old('email'),
            'old_remember' => old('remember') ? true : false,
        ];
    @endphp

    <memorisation :auth='@json($memorisationAuth)'></memorisation>
@endsection
