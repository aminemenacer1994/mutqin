@extends('mail.layout')

@section('title', __('mail.revision_reminder_subject', ['surah' => $surahName ?? '']))
@section('preheader', __('mail.revision_reminder_preheader'))
@section('heading', __('mail.revision_reminder_heading'))

@section('content')
<p style="margin:0 0 16px;">
    @if (! empty($userName))
        {{ __('mail.revision_reminder_greeting_named', ['name' => $userName]) }}
    @else
        {{ __('mail.revision_reminder_greeting') }}
    @endif
</p>

<p style="margin:0 0 24px;">
    {{ __('mail.revision_reminder_body', [
        'surah' => $surahName ?? '',
        'ayahs' => $ayahRange ?? '',
    ]) }}
</p>

@include('mail.components.action', [
    'url' => $url,
    'label' => __('mail.revision_reminder_action'),
    'fallbackIntro' => __('mail.revision_reminder_fallback'),
])
@endsection
