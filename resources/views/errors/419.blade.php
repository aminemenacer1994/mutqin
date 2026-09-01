@extends('layouts.error')

@section('title', __('ui.error_expired_title'))

@section('content')
    <div class="mutqin-error-card" role="alert">
        <div class="mutqin-error-card__icon" aria-hidden="true">
            <i class="bi bi-shield-exclamation"></i>
        </div>
        <h1>{{ __('ui.error_expired_title') }}</h1>
        <p>{{ __('ui.error_expired_message') }}</p>
        <div class="mutqin-error-card__actions">
            <a class="mutqin-error-btn--primary" href="{{ url('/') }}">
                {{ __('ui.error_return_home') }}
            </a>
        </div>
    </div>
@endsection
