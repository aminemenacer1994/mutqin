<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AdminEmails;
use App\Support\AuthRedirect;
use Illuminate\Foundation\Auth\RegistersUsers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RegisterController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Register Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles the registration of new users as well as their
    | validation and creation. By default this controller uses a trait to
    | provide this functionality without requiring any additional code.
    |
    */

    use RegistersUsers;

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest');
    }

    /**
     * Where to redirect users after registration (role-aware).
     */
    protected function redirectTo(): string
    {
        return AuthRedirect::path($this->guard()->user(), justRegistered: true);
    }

    /**
     * Get a validator for an incoming registration request.
     *
     * @return \Illuminate\Contracts\Validation\Validator
     */
    protected function validator(array $data)
    {
        return Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users',
                Rule::notIn(AdminEmails::reserved()),
            ],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'email.not_in' => 'This email address is reserved.',
        ]);
    }

    /**
     * Create a new user instance after a valid registration.
     *
     * @return User
     */
    protected function create(array $data)
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'password_set_at' => now(),
        ]);
    }

    protected function registered(Request $request, $user)
    {
        // Match login/Google: login event id powers Welcome Back vs onboarding,
        // and just_registered must survive the redirect into /memorisation.
        $request->session()->put('mutqin_login_event_id', (string) Str::uuid());
        // Persist until /memorisation consumes it so a dashboard stopover does not drop the flag.
        $request->session()->put('mutqin_just_registered', true);
        // Existing-user Welcome Back must not win over first-run onboarding.
        $request->session()->forget('mutqin_just_logged_in');

        return redirect()->to(AuthRedirect::to($user, justRegistered: true));
    }
}
