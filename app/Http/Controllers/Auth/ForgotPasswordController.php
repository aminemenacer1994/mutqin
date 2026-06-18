<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\SendsPasswordResetEmails;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Password Reset Controller
    |--------------------------------------------------------------------------
    |
    | This controller is responsible for handling password reset emails and
    | includes a trait which assists in sending these notifications from
    | your application to your users. Feel free to explore this trait.
    |
    */

    use SendsPasswordResetEmails;

    protected function sendResetLinkResponse($request, $response): RedirectResponse
    {
        return back()->with('status', __($response));
    }

    protected function sendResetLinkFailedResponse($request, $response): RedirectResponse
    {
        return back()
            ->withInput($request->only('email'))
            ->withErrors(['email' => $this->resetFailureMessage($response)]);
    }

    private function resetFailureMessage(string $response): string
    {
        return match ($response) {
            Password::INVALID_USER => 'We could not find an account with that email address.',
            Password::RESET_THROTTLED => 'A reset link was sent recently. Please wait a moment and try again.',
            default => 'Unable to send the reset link right now. Please try again.',
        };
    }
}
