<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\WaitingListEmailHash;
use Illuminate\Http\Request;
use Illuminate\View\View;

class RegisteredUserUnsubscribeController extends Controller
{
    public function __invoke(Request $request, User $user): View
    {
        abort_unless($request->hasValidSignature(), 403);

        $email = WaitingListEmailHash::normalize((string) $request->query('email', ''));
        abort_unless(
            $email !== '' && $email === WaitingListEmailHash::normalize((string) $user->email),
            403
        );

        if ($user->marketing_unsubscribed_at === null) {
            $user->forceFill(['marketing_unsubscribed_at' => now()])->save();
        }

        return view('content.waiting-list-unsubscribed');
    }
}
