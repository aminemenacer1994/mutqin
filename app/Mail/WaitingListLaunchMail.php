<?php

namespace App\Mail;

use App\Support\TransactionalMail;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WaitingListLaunchMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $platformUrl,
        public string $unsubscribeUrl,
    ) {}

    public function envelope(): Envelope
    {
        $envelope = new Envelope(
            subject: __('mail.waitlist_launch_subject'),
        );

        $replyTo = TransactionalMail::replyTo();
        if ($replyTo !== null) {
            $envelope->replyTo($replyTo[0], $replyTo[1]);
        }

        return $envelope;
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.waitlist-launch',
            text: 'mail.text.waitlist-launch',
            with: [
                'recipientName' => $this->recipientName,
                'platformUrl' => $this->platformUrl,
                'unsubscribeUrl' => $this->unsubscribeUrl,
            ],
        );
    }
}
