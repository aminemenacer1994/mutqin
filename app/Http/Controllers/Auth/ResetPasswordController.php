<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Foundation\Auth\ResetsPasswords;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Password Reset Controller
    |--------------------------------------------------------------------------
    |
    | This controller is responsible for handling password reset requests
    | and uses a simple trait to include this behavior. You're free to
    | explore this trait and override any methods you wish to tweak.
    |
    */

    use ResetsPasswords;

    /**
     * Where to redirect users after resetting their password.
     *
     * @var string
     */
    protected $redirectTo = '/memorisation';

    /**
     * @param  \Illuminate\Contracts\Auth\CanResetPassword  $user
     */
    protected function resetPassword($user, $password): void
    {
        $user->forceFill([
            'password' => $password,
            'password_set_at' => now(),
            'remember_token' => Str::random(60),
        ])->save();

        event(new PasswordReset($user));

        $this->guard()->login($user);
    }

    protected function sendResetResponse($request, $response): RedirectResponse
    {
        return redirect($this->redirectPath())->with('status', __($response));
    }

    protected function sendResetFailedResponse($request, $response): RedirectResponse
    {
        return back()
            ->withInput($request->only('email'))
            ->withErrors([
                'email' => $this->resetFailureMessage($response),
            ]);
    }

    private function resetFailureMessage(string $response): string
    {
        return match ($response) {
            Password::INVALID_TOKEN => 'That reset link is invalid or has expired. Request a new one and try again.',
            Password::INVALID_USER => 'We could not find an account with that email address.',
            default => 'Unable to reset the password. Please try again.',
        };
    }
}
