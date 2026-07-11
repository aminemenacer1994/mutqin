@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-stage auth-stage-single">
        <section class="auth-panel auth-panel-form">
            <div class="auth-form-wrap">
                <!-- <a class="auth-brand auth-brand-static" href="{{ route('memorisation') }}" aria-label="Open memorisation workspace">
                    <span class="auth-brand-mark"><i class="bi bi-book-half" aria-hidden="true"></i></span>
                    <span class="auth-brand-text">
                        <strong>Mutqin</strong>
                        <small>{{ __('ui.auth_workspace_label') }}</small>
                    </span>
                </a> -->

                <div class="auth-copy auth-copy-compact">
                    <h2 class="auth-form-title" data-i18n="login">{{ __('ui.login') }}</h2>
                    <!-- <p class="auth-form-subtitle" data-i18n="auth_login_subtitle">{{ __('ui.auth_login_subtitle') }}</p> -->
                </div>

                @if (session('error'))
                    <div class="alert alert-danger auth-alert" role="alert">{{ session('error') }}</div>
                @endif
                @error('google')
                    <div class="alert alert-danger auth-alert" role="alert">{{ $message }}</div>
                @enderror

                <a href="{{ route('auth.google.redirect') }}" class="auth-google-btn" aria-label="{{ __('ui.continue_google') }}">
                    <span class="auth-google-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#fbbc05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"/>
                        </svg>
                    </span>
                    <span>{{ __('ui.continue_google') }}</span>
                </a>

                <div class="auth-divider"><span>{{ __('ui.auth_or') }}</span></div>

                <form method="POST" action="{{ route('login') }}" class="auth-form-grid">
                    @csrf

                    <div class="auth-field">
                        <label for="email" class="form-label" data-i18n="email_address">{{ __('ui.email_address') }}</label>
                        <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>

                        @error('email')
                            <span class="invalid-feedback" role="alert">
                                <strong>{{ $message }}</strong>
                            </span>
                        @enderror
                    </div>

                    <div class="auth-field">
                        <label for="password" class="form-label" data-i18n="password">{{ __('ui.password') }}</label>
                        <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="current-password">

                        @error('password')
                            <span class="invalid-feedback" role="alert">
                                <strong>{{ $message }}</strong>
                            </span>
                        @enderror
                    </div>

                    <div class="auth-meta-row">
                        <label class="auth-check" for="remember">
                            <input class="form-check-input" type="checkbox" name="remember" id="remember" {{ old('remember') ? 'checked' : '' }}>
                            <span data-i18n="remember_me">{{ __('ui.remember_me') }}</span>
                        </label>

                        @if (Route::has('password.request'))
                            <a class="auth-text-link" href="{{ route('password.request') }}">
                                <span data-i18n="forgot_password">{{ __('ui.forgot_password') }}</span>
                            </a>
                        @endif
                    </div>

                    <div class="auth-actions auth-actions-stack">
                        <button type="submit" class="btn auth-btn-primary auth-submit">
                            <span data-i18n="login">{{ __('ui.login') }}</span>
                        </button>
                    </div>
                </form>

                @if (Route::has('register'))
                    <p class="auth-switch">
                        {{ __('ui.auth_new_to_mutqin') }}
                        <a href="{{ route('register') }}" data-i18n="register">{{ __('ui.register') }}</a>
                    </p>
                @endif
            </div>
        </section>
    </div>
</div>
@endsection
