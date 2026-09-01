@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.new_password_kicker') }}</p>
            <h1 class="auth-heading">{{ __('ui.new_password_title') }}</h1>
            <p class="auth-lede">{{ __('ui.new_password_subtitle') }}</p>
        </header>

        @if (session('status'))
            <div class="alert alert-success auth-alert" role="alert">{{ session('status') }}</div>
        @endif

        <form method="POST" action="{{ route('password.update') }}" class="auth-form">
            @csrf
            <input type="hidden" name="token" value="{{ $token }}">

            <div class="auth-field">
                <label for="email" class="form-label">{{ __('ui.email_address') }}</label>
                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ $email ?? old('email') }}" required autocomplete="email" autofocus>
                @error('email')
                    <span class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="auth-field">
                <label for="password" class="form-label">{{ __('ui.password') }}</label>
                <div class="auth-password-wrap">
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="new-password">
                    <button type="button" class="auth-password-toggle" data-password-toggle="password" aria-label="{{ __('ui.show_password') }}">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>
                </div>
                @error('password')
                    <span class="invalid-feedback" role="alert">{{ $message }}</span>
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

            <button type="submit" class="btn auth-submit">{{ __('ui.reset_password') }}</button>
        </form>

        <p class="auth-footer">
            <a href="{{ route('password.request') }}">{{ __('ui.forgot_password') }}</a>
        </p>
    </div>
</div>
@endsection
