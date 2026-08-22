<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\EnsureDemoLoginAccount;
use App\Support\AuthRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class DemoLoginController extends Controller
{
    public function __construct()
    {
        $this->middleware('guest');
        $this->middleware('throttle:10,1');
    }

    public function __invoke(Request $request, EnsureDemoLoginAccount $ensureDemoLoginAccount): RedirectResponse
    {
        if (! config('app.show_demo_accounts')) {
            abort(404);
        }

        $user = $ensureDemoLoginAccount->ensure();

        Auth::login($user, true);
        $request->session()->regenerate();
        $request->session()->put('mutqin_login_event_id', (string) Str::uuid());
        $request->session()->put('mutqin_just_logged_in', true);

        return redirect()->intended(AuthRedirect::path($user));
    }
}
