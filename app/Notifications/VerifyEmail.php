<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as VerifyEmailBase;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmail extends VerifyEmailBase
{
    /**
     * Build the Mutqin-branded verification email (Resend / Laravel Mail).
     *
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        if (static::$toMailCallback) {
            return call_user_func(static::$toMailCallback, $notifiable, $verificationUrl);
        }

        return (new MailMessage)
            ->subject(__('mail.verify_subject'))
            ->view('mail.verify-email', [
                'url' => $verificationUrl,
                'userName' => $notifiable->name ?? null,
            ]);
    }
}
