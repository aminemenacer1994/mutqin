@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-eyebrow"><i class="bi bi-shield-lock"></i> Confirm access</div>
            <h1 class="auth-title">{{ __('Confirm Password') }}</h1>
            <p class="auth-subtitle">{{ __('Please confirm your password before continuing.') }}</p>
        </div>
        <div class="auth-form-wrap">
            <form method="POST" action="{{ route('password.confirm') }}">
                @csrf

                <div class="mb-3">
                    <label for="password" class="form-label">{{ __('Password') }}</label>
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="current-password">

                    @error('password')
                        <span class="invalid-feedback" role="alert">
                            <strong>{{ $message }}</strong>
                        </span>
                    @enderror
                </div>

                <div class="auth-actions">
                    <button type="submit" class="btn auth-btn-primary">
                        {{ __('Confirm Password') }}
                    </button>

                    @if (Route::has('password.request'))
                        <a class="auth-form-link" href="{{ route('password.request') }}">
                            {{ __('Forgot Your Password?') }}
                        </a>
                    @endif
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
