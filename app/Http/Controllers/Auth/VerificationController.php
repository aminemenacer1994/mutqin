<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthRedirect;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\VerifiesEmails;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VerificationController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Email Verification Controller
    |--------------------------------------------------------------------------
    |
    | This controller is responsible for handling email verification for any
    | user that recently registered with the application. Emails may also
    | be re-sent if the user didn't receive the original email message.
    |
    */

    use VerifiesEmails;

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('signed')->only('verify');
        $this->middleware('throttle:6,1')->only('verify', 'resend');
    }

    /**
     * Where to redirect users after verification (role-aware).
     */
    protected function redirectTo(): string
    {
        return AuthRedirect::path(Auth::user());
    }

    /**
     * Confirm a pending mailbox without dropping the current verified identity,
     * then fall back to first-time verification.
     *
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     *
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function verify(Request $request)
    {
        if (! hash_equals((string) $request->route('id'), (string) $request->user()->getKey())) {
            throw new AuthorizationException;
        }

        $user = $request->user();
        $hash = (string) $request->route('hash');

        if ($user->hasPendingEmailChange()) {
            if (! hash_equals($hash, sha1($user->pending_email))) {
                throw new AuthorizationException;
            }

            $user->forceFill([
                'email' => $user->pending_email,
                'pending_email' => null,
                'email_verified_at' => now(),
            ])->save();

            $user->revaluateAdminEligibility();

            event(new Verified($user->fresh()));

            return $request->wantsJson()
                ? new JsonResponse([], 204)
                : redirect()->route('profile.show')->with('profile_status', __('profile.email_confirmed'));
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            throw new AuthorizationException;
        }

        if ($user->hasVerifiedEmail()) {
            return $request->wantsJson()
                ? new JsonResponse([], 204)
                : redirect($this->redirectPath());
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return $request->wantsJson()
            ? new JsonResponse([], 204)
            : redirect($this->redirectPath())->with('verified', true);
    }

    /**
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function resend(Request $request)
    {
        $user = $request->user();

        if ($user->hasPendingEmailChange() || ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();

            return $request->wantsJson()
                ? new JsonResponse([], 202)
                : back()->with('resent', true);
        }

        return $request->wantsJson()
            ? new JsonResponse([], 204)
            : redirect($this->redirectPath());
    }
}
