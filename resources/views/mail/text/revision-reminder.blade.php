{{ __('mail.revision_reminder_heading') }}

@if (! empty($userName))
{{ __('mail.revision_reminder_greeting_named', ['name' => $userName]) }}
@else
{{ __('mail.revision_reminder_greeting') }}
@endif

{{ __('mail.revision_reminder_body', ['surah' => $surahName ?? '', 'ayahs' => $ayahRange ?? '']) }}

{{ __('mail.revision_reminder_action') }}: {{ $url }}
