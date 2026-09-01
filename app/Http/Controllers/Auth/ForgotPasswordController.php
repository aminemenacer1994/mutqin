<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Foundation\Auth\SendsPasswordResetEmails;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function __construct()
    {
        $this->middleware('guest');
        $this->middleware('throttle:6,1')->only('sendResetLinkEmail');
    }

    /**
     * Always return a generic success response. Reset mail is only created for
     * local password accounts; unknown and OAuth-only emails are silent no-ops.
     */
    public function sendResetLinkEmail(Request $request): RedirectResponse|JsonResponse
    {
        $this->validateEmail($request);

        $email = (string) $request->input('email');
        $user = User::query()->where('email', $email)->first();

        // Password reset is for local password accounts only. Google-only users
        // set a password from Profile while signed in with Google.
        if ($user instanceof User && $user->hasSetPassword()) {
            // Broker sends to the account's stored email and enforces token throttle.
            $this->broker()->sendResetLink($this->credentials($request));
        }

        return $this->sendResetLinkResponse($request, Password::RESET_LINK_SENT);
    }

    protected function sendResetLinkResponse($request, $response): RedirectResponse|JsonResponse
    {
        $message = __('passwords.sent');

        return $request->wantsJson()
            ? new JsonResponse(['message' => $message], 200)
            : back()->with('status', $message);
    }
}
