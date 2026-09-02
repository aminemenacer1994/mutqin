<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthRedirect;
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

    protected function authenticated(Request $request, $user): void
    {
        if ($user instanceof \App\Models\User) {
            $user->touchLastLogin();
            \App\Services\AdminDashboardService::invalidateCaches();

            // Bind session theme to this account immediately so a prior guest/other
            // user's cookie cannot bleed into the first authenticated responses.
            $aliases = [
                'light' => 'light-mode',
                'light-mode' => 'light-mode',
                'sepia' => 'sepia-mode',
                'sepia-mode' => 'sepia-mode',
                'dark' => 'dark-mode',
                'dark-mode' => 'dark-mode',
            ];
            $raw = is_string($user->theme) ? strtolower($user->theme) : '';
            $theme = $aliases[$raw] ?? 'sepia-mode';
            $request->session()->put('mutqin_theme', $theme);
            cookie()->queue(cookie('mutqin_theme', $theme, 60 * 24 * 365, null, null, false, false, false, 'lax'));
        }

        $request->session()->put('mutqin_login_event_id', (string) Str::uuid());
        // Put (not flash): Welcome Back is consumed on first /memorisation visit.
        // Survive any intermediate hops (e.g. dashboard) before practice loads.
        $request->session()->put('mutqin_just_logged_in', true);
    }

    /**
     * Where to redirect users after logout.
     */
    protected function loggedOut($request): RedirectResponse
    {
        // Reset guest theme so the next person on this device does not inherit this account.
        $request->session()->put('mutqin_theme', 'sepia-mode');

        return redirect()
            ->route('memorisation')
            ->withCookie(cookie('mutqin_theme', 'sepia-mode', 60 * 24 * 365, null, null, false, false, false, 'lax'));
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
