@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-kicker" data-i18n="resetKicker">Need a reset?</div>
            <h1 class="auth-title" data-i18n="resetTitle">{{ __('Reset your password') }}</h1>
            <p class="auth-subtitle" data-i18n="resetSubtitle">Enter your email and we will send a reset link.</p>
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
                        <span data-i18n="sendResetLink">{{ __('Send Password Reset Link') }}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
