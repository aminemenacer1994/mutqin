@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card">
        <div class="auth-copy">
            <div class="auth-kicker" data-i18n="authRegisterKicker">Start here</div>
            <p class="auth-subtitle" data-i18n="authRegisterSubtitle">A clean setup for memorisation, revision, and tracking.</p>
        </div>
        <div class="auth-form-wrap">
                    <form method="POST" action="{{ route('register') }}">
                        @csrf

                        <div class="mb-3">
                            <label for="name" class="form-label" data-i18n="name">{{ __('Name') }}</label>
                                <input id="name" type="text" class="form-control @error('name') is-invalid @enderror" name="name" value="{{ old('name') }}" required autocomplete="name" autofocus>

                                @error('name')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                        </div>

                        <div class="mb-3">
                            <label for="email" class="form-label" data-i18n="emailAddress">{{ __('Email Address') }}</label>
                                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email">

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
                                    <span data-i18n="register">{{ __('Register') }}</span>
                                </button>
                        </div>
                    </form>
        </div>
    </div>
</div>
@endsection
