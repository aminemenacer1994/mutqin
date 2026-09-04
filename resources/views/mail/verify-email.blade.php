@extends('mail.layout')

@section('title', __('mail.verify_subject'))
@section('heading', __('mail.verify_heading'))

@section('content')
<p style="margin:0 0 16px;">
    @if ($userName)
        {{ __('mail.verify_greeting_named', ['name' => $userName]) }}
    @else
        {{ __('mail.verify_greeting') }}
    @endif
</p>

<p style="margin:0 0 24px;">{{ __('mail.verify_body') }}</p>

<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
    <tr>
        <td style="border-radius:10px;background-color:#1f6b4f;">
            <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                {{ __('mail.verify_action') }}
            </a>
        </td>
    </tr>
</table>

<p style="margin:0 0 12px;font-size:14px;color:#4a6358;">{{ __('mail.verify_fallback') }}</p>
<p style="margin:0 0 24px;word-break:break-all;font-size:13px;line-height:1.5;color:#1f6b4f;">
    <a href="{{ $url }}" style="color:#1f6b4f;">{{ $url }}</a>
</p>

<p style="margin:0;font-size:14px;color:#667a70;">{{ __('mail.verify_security') }}</p>
@endsection
