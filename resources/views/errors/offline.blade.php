@extends('layouts.error')

@section('title', __('ui.error_offline_title'))

@section('content')
    <div class="mutqin-error-card" role="alert">
        <div class="mutqin-error-card__icon is-offline" aria-hidden="true">
            <i class="bi bi-wifi-off"></i>
        </div>
        <div class="mutqin-error-card__copy">
            <h1>{{ __('ui.error_offline_title') }}</h1>
            <p>{{ __('ui.error_offline_message') }}</p>
        </div>
        <div class="mutqin-error-card__actions">
            <button type="button" class="mutqin-error-btn--primary" onclick="window.location.reload()">
                {{ __('ui.error_retry') }}
            </button>
            <a class="mutqin-error-btn--secondary" href="{{ url('/') }}">
                {{ __('ui.error_return_home') }}
            </a>
        </div>
    </div>
@endsection
