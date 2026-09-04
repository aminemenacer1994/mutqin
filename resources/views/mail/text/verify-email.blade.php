@extends('mail.text.layout')

@section('heading')
{!! __('mail.verify_heading') !!}
@endsection

@section('content')
{!! __('mail.verify_body', ['minutes' => $expireMinutes ?? 60]) !!}

{!! __('mail.verify_action') !!}:
{!! $url !!}

{!! __('mail.verify_security') !!}
@endsection
