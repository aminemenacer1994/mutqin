@extends('mail.layout')

@push('email-head')
        .email-wordmark,
        .email-heading,
        .email-tagline,
        .email-body-copy { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; }
        .email-heading { font-weight: 600 !important; }
@endpush

@section('title', __('mail.waitlist_launch_subject'))
@section('preheader', __('mail.waitlist_launch_preheader'))
@section('heading', __('mail.waitlist_launch_heading'))

@section('content')
@php
    $name = trim((string) ($recipientName ?? ''));
    $useNamedGreeting = $name !== '' && strcasecmp($name, 'there') !== 0;
    $copyFont = "font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;";
@endphp
<div class="email-launch">
<p class="email-body-copy" style="margin:0 0 12px;{{ $copyFont }}">
    @if ($useNamedGreeting)
        {{ __('mail.waitlist_launch_greeting_named', ['name' => $name]) }}
    @else
        {{ __('mail.waitlist_launch_greeting') }}
    @endif
</p>

<p class="email-body-copy" style="margin:0 0 20px;{{ $copyFont }}">{{ __('mail.waitlist_launch_body') }}</p>

@include('mail.components.action', [
    'url' => $platformUrl,
    'label' => __('mail.waitlist_launch_action'),
    'fallbackIntro' => __('mail.waitlist_launch_fallback'),
])

<p class="email-body-copy" style="margin:16px 0 0;{{ $copyFont }}">{{ __('mail.waitlist_launch_signoff') }}</p>
</div>
@endsection
