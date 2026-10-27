<?php

namespace App\Http\Controllers;

use App\Models\WaitingListEntry;
use App\Support\WaitingListEmailHash;
use Illuminate\Http\Request;
use Illuminate\View\View;

class WaitingListUnsubscribeController extends Controller
{
    public function __invoke(Request $request, WaitingListEntry $entry): View
    {
        abort_unless($request->hasValidSignature(), 403);

        $email = WaitingListEmailHash::normalize((string) $request->query('email', ''));
        abort_unless(
            $email !== '' && $email === WaitingListEmailHash::normalize((string) $entry->email),
            403
        );

        if ($entry->unsubscribed_at === null) {
            $entry->forceFill(['unsubscribed_at' => now()])->save();
        }

        return view('content.waiting-list-unsubscribed');
    }
}
