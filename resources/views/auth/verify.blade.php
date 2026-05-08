@extends('layouts.app')

@section('content')
<div class="auth-shell">
    <div class="auth-card auth-card-sm">
        <div class="auth-copy">
            <div class="auth-kicker">One last step</div>
            <h1 class="auth-title">{{ __('Verify your email') }}</h1>
            <p class="auth-subtitle">Open the link in your inbox to unlock full access.</p>
        </div>
        <div class="auth-form-wrap">
                    @if (session('resent'))
                        <div class="alert alert-success auth-alert" role="alert">
                            {{ __('A fresh verification link has been sent to your email address.') }}
                        </div>
                    @endif

                    <p class="mb-3">{{ __('Before proceeding, please check your email for a verification link.') }}</p>
                    <p class="mb-0">{{ __('If you did not receive the email') }},
                    <form class="d-inline" method="POST" action="{{ route('verification.resend') }}">
                        @csrf
                        <button type="submit" class="btn auth-btn-link p-0 m-0 align-baseline">{{ __('click here to request another') }}</button>.
                    </form>
                    </p>
        </div>
    </div>
</div>
@endsection
