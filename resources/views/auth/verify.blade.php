@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel auth-panel--verify">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.verify_kicker') }}</p>
            <h1 class="auth-heading">{{ __('ui.verify_title') }}</h1>
            <p class="auth-lede">{{ __('ui.verify_subtitle') }}</p>
            @if (auth()->user()?->getEmailForVerification())
                <p class="auth-lede auth-lede--meta">{{ __('ui.verify_sent_to', ['email' => auth()->user()->getEmailForVerification()]) }}</p>
            @endif
        </header>

        @if (session('resent'))
            <div class="alert alert-success auth-alert" role="alert">
                {{ __('ui.verify_resent') }}
            </div>
        @endif

        <form method="POST" action="{{ route('verification.resend') }}" class="auth-form auth-form--solo">
            @csrf
            <button type="submit" class="btn auth-submit">{{ __('ui.verify_resend_button') }}</button>
        </form>

        <p class="auth-footer auth-footer--meta">{{ __('ui.verify_spam') }}</p>

        <div class="auth-footer">
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button type="submit" class="auth-link">{{ __('ui.verify_wrong_email') }}</button>
            </form>
        </div>
    </div>
</div>
@endsection
