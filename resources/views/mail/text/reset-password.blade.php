@extends('mail.text.layout')

@section('heading')
{!! __('mail.reset_heading') !!}
@endsection

@section('content')
{!! __('mail.reset_body', ['minutes' => $expireMinutes ?? 60]) !!}

{!! __('mail.reset_action') !!}:
{!! $url !!}

{!! __('mail.reset_security') !!}
@endsection
