@extends('mail.layout')

@section('title', __('mail.verify_subject'))
@section('preheader', __('mail.verify_preheader', ['minutes' => $expireMinutes ?? 60]))
@section('heading', __('mail.verify_heading'))

@section('content')
<p style="margin:0 0 16px;">
    @if (! empty($userName))
        {{ __('mail.verify_greeting_named', ['name' => $userName]) }}
    @else
        {{ __('mail.verify_greeting') }}
    @endif
</p>

@include('mail.components.expiry-badge', ['minutes' => $expireMinutes ?? 60])

<p style="margin:0 0 24px;">{{ __('mail.verify_body', ['minutes' => $expireMinutes ?? 60]) }}</p>

@include('mail.components.action', [
    'url' => $url,
    'label' => __('mail.verify_action'),
    'fallbackIntro' => __('mail.verify_fallback'),
])

@include('mail.components.security-note', [
    'text' => __('mail.verify_security'),
])
@endsection
