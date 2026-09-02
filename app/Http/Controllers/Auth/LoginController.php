<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthRedirect;
use App\Support\Theme;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\View\View;

class LoginController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles authenticating users for the application and
    | redirecting them to your home screen. The controller uses a trait to
    | conveniently provide its functionality to your applications.
    |
    */

    use AuthenticatesUsers;

    public function showLoginForm(): View
    {
        return view('auth.login');
    }

    /**
     * Where to redirect users after login (role-aware).
     */
    protected function redirectTo(): string
    {
        return AuthRedirect::path($this->guard()->user());
    }

    protected function authenticated(Request $request, $user): RedirectResponse
    {
        if ($user instanceof User) {
            $user->touchLastLogin();
            \App\Services\AdminDashboardService::invalidateCaches();

            if (! is_string($user->theme) || $user->theme === '') {
                $user->forceFill(['theme' => Theme::DEFAULT_PREFERENCE])->save();
            }

            // Bind session theme to this account immediately so a prior guest/other
            // user's cookie cannot bleed into the first authenticated responses.
            $theme = Theme::normalizePreference($user->theme);
            $request->session()->put('mutqin_theme', $theme);
            cookie()->queue(cookie(Theme::COOKIE, $theme, 60 * 24 * 365, null, null, false, false, false, 'lax'));
        }

        $request->session()->put('mutqin_login_event_id', (string) Str::uuid());
        // Put (not flash): Welcome Back is consumed on first /memorisation visit.
        $request->session()->put('mutqin_just_logged_in', true);
        // Never honour a prior /dashboard visit — login always opens practice.
        $request->session()->forget('url.intended');

        return redirect()->to(AuthRedirect::to($user instanceof User ? $user : null));
    }

    /**
     * Where to redirect users after logout.
     */
    protected function loggedOut($request): RedirectResponse
    {
        // Reset guest theme so the next person on this device does not inherit this account.
        $request->session()->put('mutqin_theme', Theme::DEFAULT_PREFERENCE);
        $request->session()->forget('mutqin_theme_set');

        return redirect()
            ->route('memorisation')
            ->withCookie(cookie(Theme::COOKIE, Theme::DEFAULT_PREFERENCE, 60 * 24 * 365, null, null, false, false, false, 'lax'))
            ->withCookie(cookie(Theme::CHOSEN_COOKIE, '', -2628000, null, null, false, false, false, 'lax'));
    }

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest')->except('logout');
        $this->middleware('auth')->only('logout');
    }
}
