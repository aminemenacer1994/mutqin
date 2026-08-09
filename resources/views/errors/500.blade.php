@extends('layouts.error')

@section('title', __('ui.error_title'))

@section('content')
    <div class="mutqin-error-card" role="alert">
        <div class="mutqin-error-card__icon" aria-hidden="true">
            <i class="bi bi-exclamation-triangle"></i>
        </div>
        <h1>{{ __('ui.error_title') }}</h1>
        <p>{{ __('ui.error_message') }}</p>
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
