@extends('layouts.error')

@section('title', __('ui.error_title'))

@section('content')
    <div class="mutqin-error-card" role="alert">
        <div class="mutqin-error-card__icon" aria-hidden="true">
            <i class="bi bi-exclamation-triangle"></i>
        </div>
        <div class="mutqin-error-card__copy">
            <h1>{{ __('ui.error_title') }}</h1>
            <p>{{ __('ui.error_message') }}</p>
            @php
                $requestId = request()?->attributes->get('mutqin.request_id') ?: request()?->headers->get('X-Request-Id');
            @endphp
            @if ($requestId)
                <p class="mutqin-error-card__reference">{{ __('ui.error_reference', ['id' => $requestId]) }}</p>
            @endif
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
