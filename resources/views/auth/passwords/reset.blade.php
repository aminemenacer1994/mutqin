@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-eyebrow" data-i18n="newPasswordKicker"><i class="bi bi-shield-lock"></i> Choose a new password</div>
            <h1 class="auth-title" data-i18n="newPasswordTitle">Set a fresh password</h1>
            <p class="auth-subtitle" data-i18n="newPasswordSubtitle">Use a strong password, then continue back into Mutqin without losing your session state.</p>
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
                    <label for="email" class="form-label" data-i18n="email_address">{{ __('ui.email_address') }}</label>
                    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ $email ?? old('email') }}" required autocomplete="email" autofocus>

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
                    <label for="password-confirm" class="form-label" data-i18n="confirm_password">{{ __('ui.confirm_password') }}</label>
                    <input id="password-confirm" type="password" class="form-control" name="password_confirmation" required autocomplete="new-password">
                </div>

                <div class="auth-actions">
                    <button type="submit" class="btn auth-btn-primary">
                        <span data-i18n="resetPassword">Update password</span>
                    </button>
                </div>
            </form>
            <p class="auth-switch">
                Need a new link?
                <a href="{{ route('password.request') }}">Request another reset email</a>
            </p>
        </div>
    </div>
</div>
@endsection
