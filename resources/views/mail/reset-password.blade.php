@extends('mail.layout')

@section('title', __('mail.reset_subject'))
@section('preheader', __('mail.reset_preheader', ['minutes' => $expireMinutes ?? 60]))
@section('heading', __('mail.reset_heading'))

@section('content')
<p style="margin:0 0 16px;">
    @if (! empty($userName))
        {{ __('mail.reset_greeting_named', ['name' => $userName]) }}
    @else
        {{ __('mail.reset_greeting') }}
    @endif
</p>

@include('mail.components.expiry-badge', ['minutes' => $expireMinutes ?? 60])

<p style="margin:0 0 20px;">{{ __('mail.reset_body') }}</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;">
    <tr>
        <td style="padding:0;">
            <p style="margin:0 0 10px;font-size:13px;line-height:1.45;font-weight:600;color:#123527;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ __('mail.reset_steps_title') }}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                @foreach ([__('mail.reset_step_1'), __('mail.reset_step_2'), __('mail.reset_step_3')] as $index => $step)
                    <tr>
                        <td valign="top" width="28" style="padding:0 10px 10px 0;font-size:13px;line-height:1.45;color:#1f6b4f;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ $index + 1 }}.</td>
                        <td valign="top" style="padding:0 0 10px;font-size:13px;line-height:1.45;color:#4a6358;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ $step }}</td>
                    </tr>
                @endforeach
            </table>
        </td>
    </tr>
</table>

@include('mail.components.action', [
    'url' => $url,
    'label' => __('mail.reset_action'),
    'fallbackIntro' => __('mail.reset_fallback'),
])

@include('mail.components.security-note', [
    'text' => __('mail.reset_security'),
])
@endsection
