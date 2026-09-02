@extends('layouts.error')

@section('title', __('ui.error_not_found_title'))

@section('content')
    <div class="mutqin-error-card" role="status">
        <div class="mutqin-error-card__icon is-info" aria-hidden="true">
            <i class="bi bi-search"></i>
        </div>
        <div class="mutqin-error-card__copy">
            <h1>{{ __('ui.error_not_found_title') }}</h1>
            <p>{{ __('ui.error_not_found_message') }}</p>
        </div>
        <div class="mutqin-error-card__actions">
            <a class="mutqin-error-btn--primary" href="{{ url('/') }}">
                {{ __('ui.error_return_home') }}
            </a>
        </div>
    </div>
@endsection
