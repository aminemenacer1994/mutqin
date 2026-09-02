<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Models\User;
use App\Services\Auth\AiAudioConsentService;
use App\Services\Memorisation\LearningHistoryRetentionService;
use App\Support\AdminEmails;
use App\Support\EmailVerification;
use App\Support\Theme;

class ProfileController extends Controller
{
    public function show(
        Request $request,
        AiAudioConsentService $consent
    ) {
        $user = $request->user();

        return view('profile', [
            'user' => $user,
            'isAdmin' => $user->isAdmin(),
            'planLabels' => $this->planLabels(),
            'aiAudioConsent' => $consent->snapshot($user),
            'verificationRequired' => EmailVerification::required(),
            'supportedLocales' => ['en', 'fr', 'ar'],
            'themeModes' => Theme::modes(),
            'currentTheme' => Theme::toDataTheme($user->theme),
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
            Rule::unique('users', 'pending_email')->ignore($user->id),
        ];
        if (! $user->hasPersistedAdminRole()) {
            $emailRules[] = Rule::notIn(AdminEmails::reserved());
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => $emailRules,
        ], [
            'name.required' => __('profile.name_required'),
            'name.max' => __('profile.name_max'),
            'email.required' => __('profile.email_required'),
            'email.email' => __('profile.email_invalid'),
            'email.unique' => __('profile.email_taken'),
            'email.not_in' => __('profile.email_reserved'),
        ]);

        $user->forceFill(['name' => $validated['name']])->save();

        return back()->with('profile_status', $this->applyEmailChange($user, $validated['email']));
    }

    public function destroyPendingEmail(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user->hasPendingEmailChange()) {
            return back()->with('profile_status', __('profile.saved_success'));
        }

        $user->forceFill(['pending_email' => null])->save();

        return back()->with('profile_status', __('profile.email_change_cancelled'));
    }

    public function updateLocale(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur'])],
        ]);

        $request->user()->forceFill([
            'locale' => $validated['locale'],
        ])->save();

        return response()->json([
            'locale' => $validated['locale'],
        ]);
    }

    public function updateTheme(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'theme' => ['required', 'string', Rule::in(Theme::acceptedInput())],
        ]);

        $theme = Theme::normalizePreference($validated['theme']);

        $request->user()->forceFill([
            'theme' => $theme,
        ])->save();

        return response()->json([
            'theme' => $theme,
        ])->cookie('mutqin_theme', $theme, 60 * 24 * 365, null, null, false, false, false, 'lax');
    }

    public function showAiAudioConsent(Request $request, AiAudioConsentService $consent): JsonResponse
    {
        return response()->json($consent->snapshot($request->user()));
    }

    public function updateAiAudioConsent(Request $request, AiAudioConsentService $consent): JsonResponse
    {
        $validated = $request->validate([
            'accepted' => ['required', 'boolean'],
        ]);

        return response()->json(
            $consent->record($request->user(), (bool) $validated['accepted'])
        );
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

    /**
     * Never silently replace a verified mailbox. When verification is on, the
     * current address stays active until the new one is confirmed.
     */
    private function applyEmailChange(User $user, string $nextEmail): string
    {
        $nextEmail = strtolower(trim($nextEmail));
        $currentEmail = strtolower((string) $user->email);
        $pendingEmail = strtolower((string) ($user->pending_email ?? ''));

        if ($nextEmail === $currentEmail) {
            return __('profile.saved_success');
        }

        if ($pendingEmail !== '' && $nextEmail === $pendingEmail) {
            if (EmailVerification::required()) {
                $user->sendEmailVerificationNotification();
            }

            return __('profile.email_change_pending', ['email' => $user->pending_email]);
        }

        if (EmailVerification::required() && $user->email_verified_at !== null) {
            $user->forceFill(['pending_email' => $nextEmail])->save();
            $user->sendEmailVerificationNotification();

            return __('profile.email_change_pending', ['email' => $nextEmail]);
        }

        $user->forceFill([
            'email' => $nextEmail,
            'pending_email' => null,
            'email_verified_at' => null,
        ])->save();

        $user->revaluateAdminEligibility();

        if (EmailVerification::required()) {
            $user->sendEmailVerificationNotification();
        }

        return __('profile.saved_success');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasPersistedAdminRole()) {
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
            'free' => __('profile.free_access'),
            'premium_monthly' => __('profile.plan_premium_monthly'),
            'premium_yearly' => __('profile.plan_premium_yearly'),
            'pro_monthly' => __('profile.plan_pro_monthly'),
            'pro_yearly' => __('profile.plan_pro_yearly'),
        ];
    }
}
