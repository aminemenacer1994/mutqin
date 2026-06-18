@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-kicker" data-i18n="newPasswordKicker">Set a new one</div>
            <h1 class="auth-title" data-i18n="newPasswordTitle">{{ __('Choose a new password') }}</h1>
            <p class="auth-subtitle" data-i18n="newPasswordSubtitle">Keep it simple. You can get back to your session after this.</p>
        </div>
        <div class="auth-form-wrap">
            @if (session('status'))
                <div class="alert alert-success auth-alert" role="alert">
                    {{ session('status') }}
                </div>
            @endif

            @if ($errors->any())
                <div class="alert alert-danger auth-alert" role="alert">
                    {{ $errors->first() }}
                </div>
            @endif

            <form method="POST" action="{{ route('password.update') }}">
                @csrf

                <input type="hidden" name="token" value="{{ $token }}">

                <div class="mb-3">
                    <label for="email" class="form-label" data-i18n="emailAddress">{{ __('Email Address') }}</label>
                    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ $email ?? old('email') }}" required autocomplete="email" autofocus>

                    @error('email')
                        <span class="invalid-feedback" role="alert">
                            <strong>{{ $message }}</strong>
                        </span>
                    @enderror
                </div>

                <div class="mb-3">
                    <label for="password" class="form-label" data-i18n="password">{{ __('Password') }}</label>
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="new-password">

                    @error('password')
                        <span class="invalid-feedback" role="alert">
                            <strong>{{ $message }}</strong>
                        </span>
                    @enderror
                </div>

                <div class="mb-3">
                    <label for="password-confirm" class="form-label" data-i18n="confirmPassword">{{ __('Confirm Password') }}</label>
                    <input id="password-confirm" type="password" class="form-control" name="password_confirmation" required autocomplete="new-password">
                </div>

                <div class="auth-actions">
                    <button type="submit" class="btn auth-btn-primary">
                        <span data-i18n="resetPassword">{{ __('Reset Password') }}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
