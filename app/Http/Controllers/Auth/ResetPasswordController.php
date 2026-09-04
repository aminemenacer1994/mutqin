<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthRedirect;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Contracts\View\View;
use Illuminate\Foundation\Auth\ResetsPasswords;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;

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
     * Show the reset form. When email + token are present but unusable, keep a
     * generic invalid/expired state so account existence cannot be probed.
     */
    public function showResetForm(Request $request): View
    {
        $token = $request->route()->parameter('token');
        $email = $request->email;

        $view = view('auth.passwords.reset')->with([
            'token' => $token,
            'email' => $email,
        ]);

        if (! is_string($email) || $email === '' || ! is_string($token) || $token === '') {
            return $view;
        }

        $user = User::query()->where('email', $email)->first();
        $usable = $user instanceof User
            && $user->hasSetPassword()
            && Password::broker()->tokenExists($user, $token);

        if ($usable) {
            return $view;
        }

        return $view->withErrors([
            'email' => __('passwords.token'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];
    }

    /**
     * Reset the given user's password without granting email verification.
     *
     * The broker only resets the account matching the token + email pair.
     *
     * @param  CanResetPassword&User  $user
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
            $request->session()->forget('url.intended');
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
