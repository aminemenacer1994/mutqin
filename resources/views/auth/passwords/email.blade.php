@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel auth-panel--reset">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.reset_kicker') }}</p>
            <h1 class="auth-heading auth-heading--solo">{{ __('ui.reset_title') }}</h1>
            <p class="auth-lede">{{ __('ui.reset_subtitle') }}</p>
        </header>

        @if (session('status'))
            <div class="alert alert-success auth-alert" role="alert">{{ session('status') }}</div>
        @endif

        @if ($errors->has('email'))
            <div class="alert alert-danger auth-alert" role="alert">{{ $errors->first('email') }}</div>
        @endif

        <form method="POST" action="{{ route('password.email') }}" class="auth-form">
            @csrf

            <div class="auth-field">
                <label for="email" class="form-label">{{ __('ui.email_address') }}</label>
                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus @if($errors->has('email')) aria-invalid="true" aria-describedby="resetEmailError" @endif>
                @error('email')
                    <span id="resetEmailError" class="invalid-feedback d-block" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <button type="submit" class="btn auth-submit">{{ __('ui.send_reset_link') }}</button>
        </form>

        <div class="auth-actions">
            <p class="auth-footer auth-footer--meta">{{ __('ui.reset_oauth_hint') }} <a href="{{ route('auth.google.redirect') }}">{{ __('ui.continue_google') }}</a></p>

            <p class="auth-footer">
                <a href="{{ route('login') }}">{{ __('ui.auth_sign_in') }}</a>
            </p>
        </div>
    </div>
</div>
@endsection
