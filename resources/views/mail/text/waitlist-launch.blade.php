@php
    $name = trim(strip_tags((string) ($recipientName ?? '')));
    $name = trim((string) preg_replace("/[\r\n]+/u", ' ', $name));
    $useNamedGreeting = $name !== '' && strcasecmp($name, 'there') !== 0;
    $greeting = $useNamedGreeting
        ? __('mail.launch_greeting_named', ['name' => $name])
        : __('mail.launch_greeting');
    $unsubscribeUrl = trim((string) ($unsubscribeUrl ?? ''));
    $lines = [
        \App\Support\TransactionalMail::brandName(),
        __('mail.launch_tagline'),
        '',
        __('mail.launch_heading'),
        '',
        $greeting,
        '',
        __('mail.launch_intro'),
        '',
        __('mail.launch_body'),
        '',
        __('mail.launch_support'),
        '',
        __('mail.launch_action').': '.$platformUrl,
        '',
        __('mail.launch_closing'),
        '',
        __('mail.launch_thanks'),
        __('mail.launch_signoff'),
        '',
        '--',
        \App\Support\TransactionalMail::homeHost(),
        __('mail.launch_copyright', ['year' => now()->year]),
    ];
    if ($unsubscribeUrl !== '') {
        $lines[] = __('mail.launch_unsubscribe').': '.$unsubscribeUrl;
    }
@endphp
{!! implode("\n", $lines) !!}
