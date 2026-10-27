<?php

namespace App\Support;

use App\Models\WaitingListEntry;
use Illuminate\Support\Facades\URL;

final class WaitingListUnsubscribe
{
    public static function signedUrl(WaitingListEntry $entry): string
    {
        $email = WaitingListEmailHash::normalize((string) $entry->email);

        return URL::signedRoute('waiting-list.unsubscribe', [
            'entry' => $entry->getKey(),
            'email' => $email,
        ]);
    }
}
