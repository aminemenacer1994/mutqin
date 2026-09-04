<?php

namespace App\Notifications;

use App\Support\TransactionalMail;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordBase;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPassword extends ResetPasswordBase
{
    /**
     * Build the Mutqin-branded password reset email (Resend / Laravel Mail).
     *
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        if (static::$toMailCallback) {
            return call_user_func(static::$toMailCallback, $notifiable, $this->token);
        }

        return TransactionalMail::message(
            $notifiable,
            'mail.reset_subject',
            'mail.reset-password',
            'mail.text.reset-password',
            [
                'url' => $this->resetUrl($notifiable),
                'userName' => $notifiable->name ?? null,
                'expireMinutes' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire'),
            ],
        );
    }
}
