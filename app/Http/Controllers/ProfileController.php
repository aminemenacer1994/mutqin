<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Support\AdminEmails;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return view('profile', [
            'user' => $user,
            'isAdmin' => $user->isAdmin(),
            'planLabels' => $this->planLabels(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $emailRules = [
            'required',
            'string',
            'email',
            'max:255',
            Rule::unique('users', 'email')->ignore($user->id),
        ];
        if (! $user->isAdmin()) {
            $emailRules[] = Rule::notIn(AdminEmails::reserved());
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => $emailRules,
        ], [
            'name.required' => __('profile.name_required'),
            'email.required' => __('profile.email_required'),
            'email.email' => __('profile.email_invalid'),
            'email.unique' => __('profile.email_taken'),
            'email.not_in' => __('profile.email_reserved') ?: 'This email address is reserved.',
        ]);

        $emailChanged = strtolower($validated['email']) !== strtolower((string) $user->email);

        $user->forceFill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
        ])->save();

        return back()->with('profile_status', __('profile.saved_success'));
    }

    public function updateLocale(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(['en', 'ar', 'fr', 'id', 'tr', 'es'])],
        ]);

        $request->user()->forceFill([
            'locale' => $validated['locale'],
        ])->save();

        return response()->json([
            'locale' => $validated['locale'],
        ]);
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isChange = $user->hasSetPassword();

        $rules = [
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];

        if ($isChange) {
            $rules['current_password'] = ['required', 'current_password'];
        }

        $validated = $request->validate($rules, [
            'current_password.required' => __('profile.current_password_required'),
            'current_password.current_password' => __('profile.current_password_incorrect'),
            'password.required' => __('profile.new_password_required'),
            'password.min' => __('profile.password_min'),
            'password.confirmed' => __('profile.passwords_dont_match'),
        ]);

        $user->forceFill([
            'password' => $validated['password'],
            'password_set_at' => now(),
        ])->save();

        return back()->with('password_status', __('profile.password_updated'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return back()->with('billing_error', __('profile.delete_admin_blocked'));
        }

        $confirmation = trim((string) $request->input('confirmation', ''));
        $emailMatches = strcasecmp($confirmation, (string) $user->email) === 0;
        $phraseMatches = $confirmation === 'DELETE';

        if ($confirmation === '' || (! $emailMatches && ! $phraseMatches)) {
            return back()
                ->withErrors(['confirmation' => __('profile.delete_confirm_required')])
                ->withInput();
        }

        Auth::logout();

        app(LearningHistoryRetentionService::class)->deleteUserAccount($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home')->with('status', __('profile.account_deleted'));
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
