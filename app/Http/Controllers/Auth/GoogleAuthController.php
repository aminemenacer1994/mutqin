<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        $provider = Socialite::driver('google');

        if (method_exists($provider, 'stateless')) {
            $provider = $provider->stateless();
        }

        return $provider->redirect();
    }

    public function callback(): RedirectResponse
    {
        $created = false;

        try {
            $provider = Socialite::driver('google');

            if (method_exists($provider, 'stateless')) {
                $provider = $provider->stateless();
            }

            $googleUser = $provider->user();
        } catch (Throwable) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => 'Unable to sign in with Google. Please try again.']);
        }

        $email = $googleUser->getEmail();

        if (! $email) {
            return redirect()
                ->route('login')
                ->withErrors(['google' => 'Google did not return an email address for this account.']);
        }

        $user = User::where('google_id', $googleUser->getId())->first();

        if (! $user) {
            $user = User::where('email', $email)->first();

            if ($user) {
                $user->forceFill([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ])->save();
            } else {
                $user = User::create([
                    'name' => $googleUser->getName() ?: Str::before($email, '@'),
                    'email' => $email,
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'password' => Str::random(32),
                ]);
                $created = true;
            }
        } elseif ($googleUser->getAvatar() !== $user->avatar) {
            $user->forceFill([
                'avatar' => $googleUser->getAvatar(),
            ])->save();
        }

        Auth::login($user, true);
        request()->session()->regenerate();
        if ($created) {
            request()->session()->flash('mutqin_just_registered', true);
        }

        return redirect()->intended(route('memorisation'));
    }
}
