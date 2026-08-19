@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <h1 class="auth-heading">{{ __('ui.reset_title') }}</h1>

        @if (session('status'))
            <div class="alert alert-success auth-alert" role="alert">{{ session('status') }}</div>
        @endif

        <form method="POST" action="{{ route('password.email') }}" class="auth-form">
            @csrf

            <div class="auth-field">
                <label for="email" class="form-label">{{ __('ui.email_address') }}</label>
                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>
                @error('email')
                    <span class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <button type="submit" class="btn auth-submit">{{ __('ui.send_reset_link') }}</button>
        </form>

        <p class="auth-footer">
            <a href="{{ route('login') }}">{{ __('ui.auth_sign_in') }}</a>
        </p>
    </div>
</div>
@endsection
