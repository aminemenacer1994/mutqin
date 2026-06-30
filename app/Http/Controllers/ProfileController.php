<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
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

        return back()->with('profile_status', __('profile.saved_success'));
    }

    public function updateLocale(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(['en', 'ar', 'fr'])],
        ]);

        $request->user()->forceFill([
            'locale' => $validated['locale'],
        ])->save();

        return response()->json([
            'locale' => $validated['locale'],
        ]);
    }

    public function updateAiRecallMode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ai_recall_mode_enabled' => ['required', 'boolean'],
        ]);

        $request->user()->forceFill([
            'ai_recall_mode_enabled' => $validated['ai_recall_mode_enabled'],
        ])->save();

        return response()->json([
            'ai_recall_mode_enabled' => (bool) $validated['ai_recall_mode_enabled'],
        ]);
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

        return back()->with('password_status', __('profile.password_updated'));
    }

    private function planLabels(): array
    {
        return [
            'free' => __('billing.free_access'),
            'premium_monthly' => __('billing.premium_monthly'),
            'premium_yearly' => __('billing.premium_yearly'),
            'pro_monthly' => __('billing.pro_monthly'),
            'pro_yearly' => __('billing.pro_yearly'),
        ];
    }
}
