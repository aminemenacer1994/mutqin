<?php

namespace App\Services\Auth;

use App\Enums\AccountRole;
use App\Models\User;
use App\Services\Organisations\AccountRegistrationService;
use App\Support\AdminEmails;
use App\Support\Registration\RegistrationProfile;
use App\Support\TeacherFeatures;
use App\Support\Theme;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;

/**
 * Resolves Google OAuth identities without email-only auto-linking.
 *
 * Trust model:
 * - Primary key is Google subject id (`google_id`), not email.
 * - Email from Google is used only when Google reports email_verified=true.
 * - Verified local accounts with no google_id auto-link when Google reports email_verified.
 *   Profile “Link Google” remains for users who prefer an authenticated link flow.
 * - Unverified local squats are reclaimed for a verified Google identity (password wiped).
 */
class GoogleSignInService
{
    public function __construct(
        private readonly AccountRegistrationService $accounts
    ) {}

    public const GENERIC_FAILURE = 'Unable to sign in with Google. Please try again.';

    /**
     * @return array{user: ?User, created: bool, error: ?string}
     */
    public function resolve(SocialiteUserContract $googleUser, ?User $authenticatedUser = null, ?array $registrationIntent = null): array
    {
        $providerSubject = trim((string) $googleUser->getId());
        $email = strtolower(trim((string) $googleUser->getEmail()));

        if ($providerSubject === '') {
            $this->securityLog('google_oauth_missing_subject', []);

            return $this->fail(self::GENERIC_FAILURE);
        }

        if ($email === '') {
            $this->securityLog('google_oauth_missing_email', [
                'provider_subject' => $providerSubject,
            ]);

            return $this->fail(self::GENERIC_FAILURE);
        }

        if (! $this->googleEmailIsVerified($googleUser)) {
            $this->securityLog('google_oauth_unverified_email_rejected', [
                'provider_subject' => $providerSubject,
                'email_hash' => $this->emailHash($email),
            ]);

            return $this->fail(self::GENERIC_FAILURE);
        }

        return DB::transaction(function () use ($googleUser, $providerSubject, $email, $authenticatedUser, $registrationIntent) {
            $bySubject = User::query()
                ->where('google_id', $providerSubject)
                ->lockForUpdate()
                ->first();

            if ($bySubject) {
                return $this->loginExistingGoogleIdentity($bySubject, $googleUser, $email);
            }

            $byEmail = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->lockForUpdate()
                ->first();

            if (! $byEmail) {
                $isAllowlistedAdmin = AdminEmails::isAllowlisted($email);
                $user = $this->createGoogleUser($googleUser, $email, $providerSubject, $isAllowlistedAdmin, $registrationIntent);

                $this->securityLog($isAllowlistedAdmin
                    ? 'google_oauth_admin_account_created'
                    : 'google_oauth_account_created', [
                        'user_id' => $user->id,
                        'provider_subject' => $providerSubject,
                        'email_hash' => $this->emailHash($email),
                    ]);

                return ['user' => $user, 'created' => true, 'error' => null];
            }

            if ($byEmail->google_id && $byEmail->google_id !== $providerSubject) {
                $this->securityLog('google_oauth_email_owned_by_other_google_identity', [
                    'user_id' => $byEmail->id,
                    'provider_subject' => $providerSubject,
                    'email_hash' => $this->emailHash($email),
                ]);

                return $this->fail(self::GENERIC_FAILURE);
            }

            if ($byEmail->email_verified_at === null) {
                return $this->reclaimUnverifiedLocalAccount(
                    $byEmail,
                    $googleUser,
                    $email,
                    $providerSubject,
                    $registrationIntent
                );
            }

            return $this->handleVerifiedLocalCollision(
                $byEmail,
                $googleUser,
                $email,
                $providerSubject,
                $authenticatedUser
            );
        });
    }

    /**
     * @return array{user: ?User, created: bool, error: ?string}
     */
    private function loginExistingGoogleIdentity(User $user, SocialiteUserContract $googleUser, string $email): array
    {
        $updates = [];

        // Trusted Google email_verified claim always overrides a stale unverified local flag.
        if ($user->email_verified_at === null) {
            $updates['email_verified_at'] = now();
        }

        if ($googleUser->getAvatar() && $googleUser->getAvatar() !== $user->avatar) {
            $updates['avatar'] = $googleUser->getAvatar();
        }

        // Allowlisted Google mailboxes keep the persisted admin role on every sign-in.
        if (AdminEmails::isAllowlisted(strtolower(trim((string) $user->email))) && ! $user->hasPersistedAdminRole()) {
            $updates['is_admin'] = true;
            $this->securityLog('google_oauth_admin_role_restored', [
                'user_id' => $user->id,
                'provider_subject' => $user->google_id,
                'email_hash' => $this->emailHash((string) $user->email),
            ]);
        }

        $storedEmail = strtolower(trim((string) $user->email));
        if ($email !== $storedEmail) {
            $conflict = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->where('id', '!=', $user->id)
                ->exists();

            $reservedClaim = AdminEmails::isReserved($email) && ! $user->hasPersistedAdminRole() && ! AdminEmails::isAllowlisted($email);

            if ($conflict || $reservedClaim) {
                $this->securityLog($conflict
                    ? 'google_oauth_email_change_blocked_conflict'
                    : 'google_oauth_email_change_blocked_reserved', [
                        'user_id' => $user->id,
                        'provider_subject' => $user->google_id,
                        'email_hash' => $this->emailHash($email),
                    ]);
            } else {
                $updates['email'] = $email;
                $updates['email_verified_at'] = now();
                if (AdminEmails::isAllowlisted($email)) {
                    $updates['is_admin'] = true;
                }
                $this->securityLog('google_oauth_email_updated_from_provider', [
                    'user_id' => $user->id,
                    'provider_subject' => $user->google_id,
                    'email_hash' => $this->emailHash($email),
                ]);
            }
        }

        if ($updates !== []) {
            $user->forceFill($updates)->save();
        }

        if (array_key_exists('email', $updates)) {
            $user->revaluateAdminEligibility();
        }

        return ['user' => $user->fresh(), 'created' => false, 'error' => null];
    }

    /**
     * Unverified local rows do not prove email ownership. A verified Google identity
     * may reclaim the address: wipe local credentials, attach provider subject, verify.
     *
     * @return array{user: ?User, created: bool, error: ?string}
     */
    private function reclaimUnverifiedLocalAccount(
        User $squat,
        SocialiteUserContract $googleUser,
        string $email,
        string $providerSubject,
        ?array $registrationIntent = null
    ): array {
        $profile = $registrationIntent !== null
            ? RegistrationProfile::validated($registrationIntent)
            : null;
        $previousUserId = $squat->id;

        $squat->forceFill([
            'name' => $googleUser->getName() ?: ($squat->name ?: Str::before($email, '@')),
            'email' => $email,
            'email_verified_at' => now(),
            'google_id' => $providerSubject,
            'avatar' => $googleUser->getAvatar(),
            'password' => null,
            'password_set_at' => null,
            'is_admin' => AdminEmails::isAllowlisted($email) ? true : $squat->is_admin,
        ])->save();

        if ($profile !== null) {
            $this->accounts->apply($squat, $profile);
        } elseif (TeacherFeatures::enabled() && $squat->account_role === null) {
            $squat->forceFill(['account_role' => AccountRole::Individual->value])->save();
        }

        $this->securityLog('google_oauth_unverified_local_reclaimed', [
            'user_id' => $previousUserId,
            'provider_subject' => $providerSubject,
            'email_hash' => $this->emailHash($email),
        ]);

        // Treat as first real ownership of this mailbox for onboarding.
        return ['user' => $squat->fresh(), 'created' => true, 'error' => null];
    }

    /**
     * Verified local account matched by email; google_id is still null (see resolve()).
     * Google already proved mailbox ownership via email_verified upstream.
     *
     * @return array{user: ?User, created: bool, error: ?string}
     */
    private function handleVerifiedLocalCollision(
        User $local,
        SocialiteUserContract $googleUser,
        string $email,
        string $providerSubject,
        ?User $authenticatedUser
    ): array {
        if ($local->google_id !== null) {
            return $this->fail(self::GENERIC_FAILURE);
        }

        $local->forceFill([
            'google_id' => $providerSubject,
            'avatar' => $googleUser->getAvatar() ?: $local->avatar,
        ])->save();

        $explicitProfileLink = $authenticatedUser
            && (int) $authenticatedUser->id === (int) $local->id
            && strtolower(trim((string) $authenticatedUser->email)) === $email;

        $this->securityLog(
            $explicitProfileLink
                ? 'google_oauth_explicit_link_completed'
                : 'google_oauth_verified_email_auto_link',
            [
                'user_id' => $local->id,
                'provider_subject' => $providerSubject,
                'email_hash' => $this->emailHash($email),
                'authenticated_user_id' => $authenticatedUser?->id,
            ]
        );

        return ['user' => $local->fresh(), 'created' => false, 'error' => null];
    }

    private function createGoogleUser(
        SocialiteUserContract $googleUser,
        string $email,
        string $providerSubject,
        bool $isAdmin = false,
        ?array $registrationIntent = null
    ): User {
        $profile = RegistrationProfile::validated($registrationIntent);

        $user = new User;
        $user->forceFill([
            'name' => $googleUser->getName() ?: Str::before($email, '@'),
            'email' => $email,
            'email_verified_at' => now(),
            'google_id' => $providerSubject,
            'avatar' => $googleUser->getAvatar(),
            'password' => null,
            'password_set_at' => null,
            'is_admin' => $isAdmin,
            'theme' => Theme::DEFAULT_PREFERENCE,
        ])->save();

        $this->accounts->apply($user, $profile);

        return $user;
    }

    public function googleEmailIsVerified(SocialiteUserContract $googleUser): bool
    {
        $raw = method_exists($googleUser, 'getRaw') ? (array) $googleUser->getRaw() : [];

        $claim = $raw['email_verified'] ?? $raw['verified_email'] ?? null;

        if (is_bool($claim)) {
            return $claim;
        }

        if (is_int($claim) || is_float($claim)) {
            return (int) $claim === 1;
        }

        if (is_string($claim)) {
            return in_array(strtolower(trim($claim)), ['1', 'true', 'yes'], true);
        }

        return false;
    }

    /**
     * @return array{user: ?User, created: bool, error: ?string}
     */
    private function fail(string $message): array
    {
        return ['user' => null, 'created' => false, 'error' => $message];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function securityLog(string $event, array $context): void
    {
        Log::warning('auth.security.'.$event, $context);
    }

    private function emailHash(string $email): string
    {
        return hash('sha256', strtolower($email));
    }
}
