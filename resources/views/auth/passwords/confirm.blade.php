@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <h1 class="auth-heading">{{ __('ui.confirm_password') }}</h1>

        <form method="POST" action="{{ route('password.confirm') }}" class="auth-form">
            @csrf

            <div class="auth-field">
                <label for="password" class="form-label">{{ __('ui.password') }}</label>
                <div class="auth-password-wrap">
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="current-password" autofocus @if($errors->has('password')) aria-invalid="true" aria-describedby="confirmPasswordError" @endif>
                    <button type="button" class="auth-password-toggle" data-password-toggle="password" aria-label="{{ __('ui.show_password') }}">
                        <i class="bi bi-eye" aria-hidden="true"></i>
                    </button>
                </div>
                @error('password')
                    <span id="confirmPasswordError" class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror
            </div>

            <button type="submit" class="btn auth-submit">{{ __('ui.confirm_password') }}</button>

            @if (Route::has('password.request'))
                <p class="auth-footer">
                    <a href="{{ route('password.request') }}">{{ __('ui.forgot_password') }}</a>
                </p>
            @endif
        </form>
    </div>
</div>
@endsection
