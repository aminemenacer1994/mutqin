<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthRedirect;
use App\Support\EmailVerification;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\VerifiesEmails;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
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
        $this->middleware('auth')->except('verify');
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

    public function show(Request $request): RedirectResponse|View
    {
        if (! EmailVerification::required() || $request->user()->hasVerifiedEmail()) {
            return redirect($this->redirectPath());
        }

        return view('auth.verify');
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
        $user = User::query()->find($request->route('id'));
        if (! $user instanceof User) {
            throw new AuthorizationException;
        }

        $actor = $request->user();
        if ($actor instanceof User && ! hash_equals((string) $actor->getKey(), (string) $user->getKey())) {
            throw new AuthorizationException;
        }

        $hash = (string) $request->route('hash');

        if ($user->hasPendingEmailChange()) {
            if (! hash_equals($hash, sha1((string) $user->pending_email))) {
                throw new AuthorizationException;
            }

            $user->forceFill([
                'email' => $user->pending_email,
                'pending_email' => null,
                'email_verified_at' => now(),
            ])->save();

            $user->revaluateAdminEligibility();

            event(new Verified($user->fresh()));
            $actor?->refresh();

            return $this->verificationResult($request, pendingMailbox: true);
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            throw new AuthorizationException;
        }

        if ($user->hasVerifiedEmail()) {
            return $this->verificationResult($request, alreadyVerified: true);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }
        $actor?->refresh();

        return $this->verificationResult($request);
    }

    /**
     * Signed links from Outlook often open in Edge with no session. Prove the
     * mailbox without turning the link into a login token.
     */
    private function verificationResult(
        Request $request,
        bool $pendingMailbox = false,
        bool $alreadyVerified = false,
    ): JsonResponse|RedirectResponse {
        if ($request->wantsJson()) {
            return new JsonResponse([], 204);
        }

        if ($request->user()) {
            if ($pendingMailbox) {
                return redirect()->route('profile.show')->with('profile_status', __('profile.email_confirmed'));
            }

            $redirect = redirect($this->redirectPath());

            return $alreadyVerified ? $redirect : $redirect->with('verified', true);
        }

        $status = $pendingMailbox
            ? __('profile.email_confirmed')
            : ($alreadyVerified ? __('ui.verify_already_confirmed_login') : __('ui.verify_confirmed_login'));

        return redirect()->route('login')->with('status', $status);
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
