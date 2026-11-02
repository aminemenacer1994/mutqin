<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\URL;

final class RegisteredUserUnsubscribe
{
    public static function signedUrl(User $user): string
    {
        $email = WaitingListEmailHash::normalize((string) $user->email);

        return URL::signedRoute('registered-user.unsubscribe', [
            'user' => $user->getKey(),
            'email' => $email,
        ]);
    }

    public static function previewUrl(): string
    {
        return rtrim(TransactionalMail::homeUrl(), '/').'/email/unsubscribe/preview';
    }
}
