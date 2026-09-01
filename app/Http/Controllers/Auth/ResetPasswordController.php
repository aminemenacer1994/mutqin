<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthRedirect;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Foundation\Auth\ResetsPasswords;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

    public function __construct()
    {
        $this->middleware('guest');
        $this->middleware('throttle:6,1')->only('reset');
    }

    /**
     * Where to redirect users after resetting their password (role-aware).
     */
    protected function redirectTo(): string
    {
        return AuthRedirect::path($this->guard()->user());
    }

    /**
     * Reset the given user's password without granting email verification.
     *
     * The broker only resets the account matching the token + email pair.
     *
     * @param  \Illuminate\Contracts\Auth\CanResetPassword&\App\Models\User  $user
     */
    protected function resetPassword($user, $password): void
    {
        $user->forceFill([
            'password' => $password,
            'password_set_at' => now(),
            'remember_token' => Str::random(60),
            // Intentionally leave email_verified_at unchanged.
        ])->save();

        event(new PasswordReset($user));

        $this->guard()->login($user);

        $request = request();
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Rehash + password cookie for AuthenticateSession-compatible invalidation.
        Auth::logoutOtherDevices($password);

        $this->invalidateOtherAuthState($user);
    }

    /**
     * Drop leftover Sanctum tokens and other database sessions for this user.
     */
    protected function invalidateOtherAuthState(User $user): void
    {
        $user->tokens()->delete();

        if (config('session.driver') !== 'database' || ! Schema::hasTable('sessions')) {
            return;
        }

        $query = DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->getAuthIdentifier());

        $currentId = request()->hasSession() ? request()->session()->getId() : null;
        if (is_string($currentId) && $currentId !== '') {
            $query->where('id', '!=', $currentId);
        }

        $query->delete();
    }

    protected function sendResetResponse($request, $response): RedirectResponse
    {
        return redirect($this->redirectPath())->with('status', __('passwords.reset'));
    }

    protected function sendResetFailedResponse($request, $response): RedirectResponse
    {
        // Same copy for invalid user/token so attackers cannot probe account existence.
        return back()
            ->withInput($request->only('email'))
            ->withErrors([
                'email' => __('passwords.token'),
            ]);
    }
}
