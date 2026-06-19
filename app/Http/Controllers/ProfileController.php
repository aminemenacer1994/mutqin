<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return view('profile', [
            'user' => $request->user(),
            'planLabels' => $this->planLabels(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $emailChanged = strtolower($validated['email']) !== strtolower((string) $user->email);

        $user->forceFill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
        ])->save();

        return back()->with('profile_status', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        $rules = [
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];

        if (!$user->google_id) {
            $rules['current_password'] = ['required', 'current_password'];
        } elseif ($request->filled('current_password')) {
            $rules['current_password'] = ['current_password'];
        }

        $validated = $request->validate($rules, [
            'current_password.current_password' => 'The current password is incorrect.',
        ]);

        $user->forceFill([
            'password' => $validated['password'],
        ])->save();

        return back()->with('password_status', 'Password updated successfully.');
    }

    private function planLabels(): array
    {
        return [
            'free' => 'Free access',
            'premium_monthly' => 'Premium monthly',
            'premium_yearly' => 'Premium yearly',
            'pro_monthly' => 'Pro monthly',
            'pro_yearly' => 'Pro yearly',
        ];
    }
}
