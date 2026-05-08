@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-kicker">Need a reset?</div>
            <h1 class="auth-title">{{ __('Reset your password') }}</h1>
            <p class="auth-subtitle">Enter your email and we will send a reset link.</p>
        </div>
        <div class="auth-form-wrap">
                    @if (session('status'))
                        <div class="alert alert-success auth-alert" role="alert">
                            {{ session('status') }}
                        </div>
                    @endif

                    <form method="POST" action="{{ route('password.email') }}">
                        @csrf

                        <div class="mb-3">
                            <label for="email" class="form-label">{{ __('Email Address') }}</label>
                                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>

                                @error('email')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                        </div>

                        <div class="auth-actions">
                                <button type="submit" class="btn auth-btn-primary">
                                    {{ __('Send Password Reset Link') }}
                                </button>
                        </div>
                    </form>
        </div>
    </div>
</div>
@endsection
