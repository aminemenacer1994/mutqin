@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card">
        <div class="auth-copy">
            <div class="auth-kicker" data-i18n="authLoginKicker">Welcome back</div>
            <p class="auth-subtitle" data-i18n="authLoginSubtitle">Simple sign in. Your memorisation setup stays ready.</p>
        </div>
        <div class="auth-form-wrap">
            <form method="POST" action="{{ route('login') }}">
                @csrf

                @error('google')
                <div class="alert alert-danger auth-alert" role="alert">
                    {{ $message }}
                </div>
                @enderror

                <div class="mb-3">
                    <label for="email" class="form-label" data-i18n="emailAddress">{{ __('Email Address') }}</label>
                    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>

                    @error('email')
                    <span class="invalid-feedback" role="alert">
                        <strong>{{ $message }}</strong>
                    </span>
                    @enderror
                </div>

                <div class="mb-3">
                    <label for="password" class="form-label" data-i18n="password">{{ __('Password') }}</label>
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="current-password">

                    @error('password')
                    <span class="invalid-feedback" role="alert">
                        <strong>{{ $message }}</strong>
                    </span>
                    @enderror
                </div>

                <div class="mb-3 auth-inline">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="remember" id="remember" {{ old('remember') ? 'checked' : '' }}>

                        <label class="form-check-label" for="remember">
                            <span data-i18n="rememberMe">{{ __('Remember Me') }}</span>
                        </label>
                    </div>
                </div>

                <div class="auth-actions">
                    <button type="submit" class="btn auth-btn-primary">
                        <span data-i18n="login">{{ __('Login') }}</span>
                    </button>

                    <!-- Google Sign In Button -->
                    <a href="{{ route('auth.google.redirect') }}" class="w-100 mt-2 google-signin-link">
                        <picture>
                            <source srcset="https://developers.google.com/identity/images/btn_google_signin_dark_normal_web.png"
                                media="(prefers-color-scheme: dark)">
                            <img src="https://developers.google.com/identity/images/btn_google_signin_light_normal_web.png"
                                alt="Sign in with Google"
                                style="width: 100%; max-width: 240px; height: auto;">
                        </picture>
                    </a>

                    @if (Route::has('password.request'))
                    <a class="btn auth-btn-ghost" href="{{ route('password.request') }}">
                        <span data-i18n="forgotPassword">{{ __('Forgot Your Password?') }}</span>
                    </a>
                    @endif
                </div>
            </form>
        </div>
    </div>
</div>
@endsection