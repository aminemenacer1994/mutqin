@extends('mail.layout')

@section('title', __('mail.waitlist_launch_subject'))
@section('preheader', __('mail.waitlist_launch_preheader'))
@section('heading', __('mail.waitlist_launch_heading'))

@section('content')
<p style="margin:0 0 16px;">{{ __('mail.waitlist_launch_greeting') }}</p>

<p style="margin:0 0 16px;">{{ __('mail.waitlist_launch_body') }}</p>

@include('mail.components.action', [
    'url' => $platformUrl,
    'label' => __('mail.waitlist_launch_action'),
    'fallbackIntro' => __('mail.waitlist_launch_fallback'),
])

<p style="margin:0;">{{ __('mail.waitlist_launch_thanks') }}</p>
<p style="margin:16px 0 0;font-weight:600;">{{ __('mail.waitlist_launch_signoff') }}</p>
@endsection

@section('footer')
<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#8a9a92;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    {{ __('mail.waitlist_launch_footer') }}
</p>
@if (! empty($unsubscribeUrl))
<p style="margin:0;font-size:12px;line-height:1.5;color:#8a9a92;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <a href="{{ $unsubscribeUrl }}" style="color:#1f6b4f;text-decoration:underline;">{{ __('mail.waitlist_launch_unsubscribe') }}</a>
</p>
@endif
@endsection
