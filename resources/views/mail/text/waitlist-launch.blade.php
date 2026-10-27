@extends('mail.text.layout')

@php
    $lines = [
        __('mail.waitlist_launch_greeting'),
        '',
        __('mail.waitlist_launch_body'),
        '',
        __('mail.waitlist_launch_action').': '.$platformUrl,
        '',
        __('mail.waitlist_launch_thanks'),
        __('mail.waitlist_launch_signoff'),
    ];
@endphp

{{ implode("\n", $lines) }}

@if (! empty($unsubscribeUrl))
{{ "\n".__('mail.waitlist_launch_unsubscribe').': '.$unsubscribeUrl }}
@endif
