@extends('layouts.app')

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <a class="auth-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_home') }}">
            <img src="/images/logo_main.png" alt="" class="auth-brand-img">
            <span>Mutqin</span>
        </a>

        <h1 class="auth-heading">{{ __('ui.verify_title') }}</h1>

        @if (session('resent'))
            <div class="alert alert-success auth-alert" role="alert">
                {{ __('ui.verify_resent') }}
            </div>
        @endif

        <p class="auth-lede">
            {{ __('ui.verify_message') }}
        </p>

        <form method="POST" action="{{ route('verification.resend') }}" class="auth-form">
            @csrf
            <button type="submit" class="btn auth-submit">{{ __('ui.verify_resend_button') }}</button>
        </form>
    </div>
</div>
@endsection
