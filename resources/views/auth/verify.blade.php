@extends('layouts.app')

@section('content')
<div class="auth-shell auth-shell-verify">
    <div class="auth-card auth-card-sm">
        <div class="auth-decoration">
            <div class="verify-icon-wrapper">
                <div class="verify-icon">
                    <i class="bi bi-envelope-paper"></i>
                </div>
            </div>
        </div>

        <div class="auth-copy">
            <div class="auth-kicker">
                <span class="kicker-dot"></span>
                One last step
            </div>
            <h1 class="auth-title">Verify your email</h1>
            <p class="auth-subtitle">Open the link in your inbox to unlock full access.</p>
        </div>

        <div class="auth-form-wrap">
            @if (session('resent'))
                <div class="alert alert-success auth-alert" role="alert">
                    <i class="bi bi-check-circle-fill"></i>
                    {{ __('A fresh verification link has been sent to your email address.') }}
                </div>
            @endif

            <div class="verify-message">
                <div class="message-icon">
                    <i class="bi bi-inbox"></i>
                </div>
                <p class="mb-3">{{ __('Before proceeding, please check your email for a verification link.') }}</p>
                <p class="mb-0">{{ __('If you did not receive the email') }},
                    <form class="resend-form d-inline" method="POST" action="{{ route('verification.resend') }}">
                        @csrf
                        <button type="submit" class="btn-link">
                            {{ __('click here to request another') }}
                        </button>.
                    </form>
                </p>
            </div>

            <div class="verify-help">
                <i class="bi bi-question-circle"></i>
                <span>Check your spam folder if you don't see it within 5 minutes</span>
            </div>
        </div>
    </div>
</div>
@endsection