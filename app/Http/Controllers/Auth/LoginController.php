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

    /**
     * Where to redirect users after logout.
     */
    protected function loggedOut($request): RedirectResponse
    {
        return redirect()->route('memorisation');
    }

    protected function authenticated(Request $request, $user): void
    {
        $request->session()->put('mutqin_login_event_id', (string) Str::uuid());
        // Put (not flash): Welcome Back is consumed on first /memorisation visit.
        // Survive any intermediate hops (e.g. dashboard) before practice loads.
        $request->session()->put('mutqin_just_logged_in', true);
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
