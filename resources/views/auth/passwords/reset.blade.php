@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel auth-panel--reset">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.new_password_kicker') }}</p>
            <h1 class="auth-heading auth-heading--solo">{{ __('ui.new_password_title') }}</h1>
            <p class="auth-lede">{{ __('ui.new_password_subtitle') }}</p>
        </header>

        <ol class="auth-steps" aria-label="{{ __('ui.reset_steps_label') }}">
            <li class="auth-steps__item auth-steps__item--current">{{ __('ui.reset_step_open') }}</li>
            <li class="auth-steps__item auth-steps__item--current">{{ __('ui.reset_step_choose') }}</li>
            <li class="auth-steps__item">{{ __('ui.reset_step_workspace') }}</li>
        </ol>

        @if (session('status'))
            <div class="alert alert-success auth-alert" role="alert">{{ session('status') }}</div>
        @endif

        @if ($errors->any())
            <div class="alert alert-danger auth-alert" role="alert">
                <ul class="auth-alert__list">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form method="POST" action="{{ route('password.update') }}" class="auth-form">
            @csrf
            <input type="hidden" name="token" value="{{ $token }}">

            <div class="auth-field">
                <label for="email" class="form-label">{{ __('ui.email_address') }}</label>
                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ $email ?? old('email') }}" required autocomplete="email" autofocus @if($errors->has('email')) aria-invalid="true" aria-describedby="newPasswordEmailError" @endif>
                @error('email')
                    <span id="newPasswordEmailError" class="invalid-feedback d-block" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="auth-field">
                <label for="password" class="form-label">{{ __('ui.password') }}</label>
                <div class="auth-password-wrap">
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="new-password" minlength="8" @if($errors->has('password')) aria-invalid="true" aria-describedby="newPasswordError" @endif>
                    <button type="button" class="auth-password-toggle" data-password-toggle="password" aria-label="{{ __('ui.show_password') }}">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>
                </div>
                <p class="auth-field-hint">{{ __('ui.reset_password_hint') }}</p>
                @error('password')
                    <span id="newPasswordError" class="invalid-feedback d-block" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <div class="auth-field">
                <label for="password-confirm" class="form-label">{{ __('ui.confirm_password') }}</label>
                <div class="auth-password-wrap">
                    <input id="password-confirm" type="password" class="form-control @error('password') is-invalid @enderror" name="password_confirmation" required autocomplete="new-password" minlength="8">
                    <button type="button" class="auth-password-toggle" data-password-toggle="password-confirm" aria-label="{{ __('ui.show_password') }}">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>
                </div>
            </div>

            <button type="submit" class="btn auth-submit">{{ __('ui.reset_password') }}</button>
        </form>

        <p class="auth-footer auth-footer--meta">{{ __('ui.reset_link_help') }}</p>

        <p class="auth-footer">
            <a href="{{ route('password.request') }}">{{ __('ui.forgot_password') }}</a>
            <span aria-hidden="true"> · </span>
            <a href="{{ route('login') }}">{{ __('ui.auth_sign_in') }}</a>
        </p>
    </div>
</div>
@endsection
