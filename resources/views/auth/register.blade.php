@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card">
        <div class="row g-4 g-xl-5 align-items-start">
            <div class="col-lg-5 d-none d-lg-block">
                <div class="auth-copy">
                    <div class="auth-eyebrow"><i class="bi bi-chat-square-heart"></i> Start simply</div>
                    <h1 class="auth-title" data-i18n="register">{{ __('ui.register') }}</h1>
                    <p class="auth-subtitle" data-i18n="authRegisterSubtitle">Create your account in a minute, then move straight into focused Quran learning with clear next steps.</p>
                    <div class="auth-note-list">
                        <div class="auth-note">
                            <i class="bi bi-compass"></i>
                            <div>
                                <strong>Guided start</strong>
                                <span>Begin with a short sample path before you build a longer routine.</span>
                            </div>
                        </div>
                        <div class="auth-note">
                            <i class="bi bi-cloud-check"></i>
                            <div>
                                <strong>Progress stays synced</strong>
                                <span>Saved sessions, subscription state, and practice history remain attached to one account.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-lg-7">
                <div class="auth-form-wrap">
                    <div class="auth-copy d-grid d-lg-none gap-3 mb-4">
                        <div class="auth-eyebrow"><i class="bi bi-chat-square-heart"></i> Start simply</div>
                        <h1 class="auth-title mb-0" data-i18n="register">{{ __('ui.register') }}</h1>
                        <p class="auth-subtitle mb-0" data-i18n="authRegisterSubtitle">Create your account in a minute, then move straight into focused Quran learning with clear next steps.</p>
                    </div>
                    @error('google')
                        <div class="alert alert-danger auth-alert" role="alert">
                            {{ $message }}
                        </div>
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

                    <form method="POST" action="{{ route('register') }}">
                        @csrf

                        <div class="mb-3">
                            <label for="name" class="form-label" data-i18n="name">{{ __('ui.name') }}</label>
                                <input id="name" type="text" class="form-control @error('name') is-invalid @enderror" name="name" value="{{ old('name') }}" required autocomplete="name" autofocus>

                                @error('name')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                        </div>

                        <div class="mb-3">
                            <label for="email" class="form-label" data-i18n="emailAddress">{{ __('ui.email_address') }}</label>
                                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email">

                                @error('email')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                        </div>

                        <div class="mb-3">
                            <label for="password" class="form-label" data-i18n="password">{{ __('ui.password') }}</label>
                                <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="new-password">

                                @error('password')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                        </div>

                        <div class="mb-3">
                            <label for="password-confirm" class="form-label" data-i18n="confirmPassword">{{ __('ui.confirm_password') }}</label>
                                <input id="password-confirm" type="password" class="form-control" name="password_confirmation" required autocomplete="new-password">
                        </div>

                        <div class="auth-actions">
                                <button type="submit" class="btn auth-btn-primary">
                                    <span data-i18n="register">Create account</span>
                                </button>
                        </div>
                    </form>
                    <p class="auth-switch">
                        Already have an account?
                        <a href="{{ route('login') }}" data-i18n="login">{{ __('ui.login') }}</a>
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
