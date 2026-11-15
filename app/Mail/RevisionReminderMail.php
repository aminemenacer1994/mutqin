<?php

namespace App\Mail;

use App\Models\RevisionReminder;
use App\Models\User;
use App\Support\TransactionalMail;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RevisionReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public User $user,
        public RevisionReminder $reminder,
        public array $payload = [],
    ) {}

    public function envelope(): Envelope
    {
        $envelope = new Envelope(
            subject: __('mail.revision_reminder_subject', [
                'surah' => $this->payload['surah_name'] ?? ('Surah '.$this->reminder->surah_number),
            ]),
        );

        $replyTo = TransactionalMail::replyTo();
        if ($replyTo !== null) {
            $envelope->replyTo($replyTo[0], $replyTo[1]);
        }

        return $envelope;
    }

    public function content(): Content
    {
        $start = (int) ($this->payload['ayah_start'] ?? $this->reminder->ayah_start);
        $end = (int) ($this->payload['ayah_end'] ?? $this->reminder->ayah_end);
        $range = $start === $end ? (string) $start : $start.'–'.$end;

        return new Content(
            html: 'mail.revision-reminder',
            text: 'mail.text.revision-reminder',
            with: [
                'userName' => $this->user->name,
                'surahName' => $this->payload['surah_name'] ?? null,
                'ayahRange' => $range,
                'dueLabel' => $this->payload['bucket'] ?? 'due_today',
                'url' => $this->payload['href'] ?? route('dashboard'),
            ],
        );
    }
}
