@extends('mail.text.layout')

@php
    $name = trim((string) ($recipientName ?? ''));
    $useNamedGreeting = $name !== '' && strcasecmp($name, 'there') !== 0;
    $greeting = $useNamedGreeting
        ? __('mail.waitlist_launch_greeting_named', ['name' => $name])
        : __('mail.waitlist_launch_greeting');
    $lines = [
        $greeting,
        '',
        __('mail.waitlist_launch_body'),
        '',
        __('mail.waitlist_launch_action').': '.$platformUrl,
        '',
        __('mail.waitlist_launch_signoff'),
    ];
@endphp

{{ implode("\n", $lines) }}
