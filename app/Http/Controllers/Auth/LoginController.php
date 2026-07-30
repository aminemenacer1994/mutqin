<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
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
    | redirecting them to your home screen. The controller uses a trait
    | to conveniently provide its functionality to your applications.
    |
    */

    use AuthenticatesUsers;

    /**
     * Where to redirect users after login.
     *
     * @var string
     */
    protected $redirectTo = '/memorisation';

    public function showLoginForm(): View
    {
        return view('auth.login');
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
        $request->session()->flash('mutqin_just_logged_in', true);
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
