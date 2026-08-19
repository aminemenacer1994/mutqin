@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <h1 class="auth-heading">{{ __('Verify Your Email Address') }}</h1>

        @if (session('resent'))
            <div class="alert alert-success auth-alert" role="alert">
                {{ __('A fresh verification link has been sent to your email address.') }}
            </div>
        @endif

        <p class="auth-lede">
            {{ __('Before proceeding, please check your email for a verification link.') }}
        </p>

        <form method="POST" action="{{ route('verification.resend') }}" class="auth-form">
            @csrf
            <button type="submit" class="btn auth-submit">{{ __('Resend verification email') }}</button>
        </form>
    </div>
</div>
@endsection
