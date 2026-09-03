@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.auth_register_arabic') }}</p>
            <h1 class="auth-heading">{{ __('ui.auth_register_heading') }}</h1>
            <p class="auth-lede">{{ __('ui.auth_register_subtitle') }}</p>
        </header>

        @include('partials.ios-pwa-install')

        @error('google')
            <div class="alert alert-danger auth-alert" role="alert">{{ $message }}</div>
        @enderror

        <a href="{{ route('auth.google.redirect') }}" class="auth-google" aria-label="{{ __('ui.continue_google') }}">
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

        <form method="POST" action="{{ route('register') }}" class="auth-form">
            @csrf

            <div class="auth-field">
                <label for="name" class="form-label">{{ __('ui.name') }}</label>
                <input id="name" type="text" class="form-control @error('name') is-invalid @enderror" name="name" value="{{ old('name') }}" required autocomplete="name" autofocus @if($errors->has('name')) aria-invalid="true" aria-describedby="registerNameError" @endif>
                @error('name')
                    <span id="registerNameError" class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="auth-field">
                <label for="email" class="form-label">{{ __('ui.email_address') }}</label>
                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" @if($errors->has('email')) aria-invalid="true" aria-describedby="registerEmailError" @endif>
                @error('email')
                    <span id="registerEmailError" class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="auth-field">
                <label for="password" class="form-label">{{ __('ui.password') }}</label>
                <div class="auth-password-wrap">
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="new-password" @if($errors->has('password')) aria-invalid="true" aria-describedby="registerPasswordError" @endif>
                    <button type="button" class="auth-password-toggle" data-password-toggle="password" aria-label="{{ __('ui.show_password') }}">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>
                </div>
                @error('password')
                    <span id="registerPasswordError" class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="auth-field">
                <label for="password-confirm" class="form-label">{{ __('ui.confirm_password') }}</label>
                <div class="auth-password-wrap">
                    <input id="password-confirm" type="password" class="form-control" name="password_confirmation" required autocomplete="new-password">
                    <button type="button" class="auth-password-toggle" data-password-toggle="password-confirm" aria-label="{{ __('ui.show_password') }}">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>
                </div>
            </div>

            <button type="submit" class="btn auth-submit">{{ __('ui.create_account') }}</button>
        </form>

        <p class="auth-footer">
            {{ __('ui.auth_already_account') }}
            <a href="{{ route('login') }}">{{ __('ui.auth_sign_in') }}</a>
        </p>
    </div>
</div>
@endsection
