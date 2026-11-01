@extends('mail.text.layout')

@php
    $name = trim((string) ($recipientName ?? ''));
    $useNamedGreeting = $name !== '' && strcasecmp($name, 'there') !== 0;
    $greeting = $useNamedGreeting
        ? __('mail.registered_user_broadcast_greeting_named', ['name' => $name])
        : __('mail.registered_user_broadcast_greeting');
    $lines = [
        $greeting,
        '',
        __('mail.registered_user_broadcast_body'),
        '',
        __('mail.registered_user_broadcast_action').': '.$platformUrl,
        '',
        __('mail.registered_user_broadcast_signoff'),
    ];
@endphp

{{ implode("\n", $lines) }}
