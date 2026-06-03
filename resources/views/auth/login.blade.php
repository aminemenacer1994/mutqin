@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card">
        <div class="auth-copy">
            <div class="auth-kicker" data-i18n="authLoginKicker">{{ __('ui.auth_login_kicker') }}</div>
            <p class="auth-subtitle" data-i18n="authLoginSubtitle">{{ __('ui.auth_login_subtitle') }}</p>
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
                            <label for="email" class="form-label" data-i18n="emailAddress">{{ __('ui.email_address') }}</label>
                                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>

                                @error('email')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                        </div>

                        <div class="mb-3">
                            <label for="password" class="form-label" data-i18n="password">{{ __('ui.password') }}</label>
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
                                        <span data-i18n="rememberMe">{{ __('ui.remember_me') }}</span>
                                    </label>
                                </div>
                        </div>

                        <div class="auth-actions">
                                <button type="submit" class="btn auth-btn-primary">
                                    <span data-i18n="login">{{ __('ui.login') }}</span>
                                </button>

                                <!-- Google Sign In Button -->
                                <a href="{{ route('auth.google.redirect') }}" class="btn btn-outline-danger w-100 mt-2">
                                    <i class="fab fa-google"></i> <span data-i18n="continueGoogle">{{ __('ui.continue_google') }}</span>
                                </a>

                                @if (Route::has('password.request'))
                                    <a class="btn auth-btn-ghost" href="{{ route('password.request') }}">
                                        <span data-i18n="forgotPassword">{{ __('ui.forgot_password') }}</span>
                                    </a>
                                @endif
                        </div>
                    </form>
        </div>
    </div>
</div>
@endsection
