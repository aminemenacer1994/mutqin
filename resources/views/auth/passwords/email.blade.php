@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-eyebrow" data-i18n="resetKicker"><i class="bi bi-envelope-check"></i> Password reset</div>
            <h1 class="auth-title" data-i18n="resetTitle">Reset your password</h1>
            <p class="auth-subtitle" data-i18n="resetSubtitle">Enter your account email and Mutqin will send you a secure reset link.</p>
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

            <form method="POST" action="{{ route('password.email') }}">
                @csrf

                <div class="mb-3">
                    <label for="email" class="form-label" data-i18n="emailAddress">{{ __('Email Address') }}</label>
                    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>

                    @error('email')
                        <span class="invalid-feedback" role="alert">
                            <strong>{{ $message }}</strong>
                        </span>
                    @enderror
                </div>

                <div class="auth-actions">
                    <button type="submit" class="btn auth-btn-primary">
                        <span data-i18n="sendResetLink">Send reset link</span>
                    </button>
                </div>
            </form>
            <p class="auth-switch">
                Remembered it?
                <a href="{{ route('login') }}">Back to login</a>
            </p>
        </div>
    </div>
</div>
@endsection
