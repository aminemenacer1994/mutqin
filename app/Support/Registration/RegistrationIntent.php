<?php

namespace App\Support\Registration;

use App\Enums\AccountRole;

/**
 * Role and organisation captured on the registration page before Google OAuth.
 * Login-page Google sign-in clears this so it cannot relabel an unrelated account.
 */
final class RegistrationIntent
{
    public const SESSION_KEY = 'mutqin_registration_intent';

    public const ARMED_KEY = 'mutqin_registration_intent_armed';

    public const TTL_MINUTES = 30;

    /**
     * @param  array<string, mixed>  $data
     */
    public static function store(array $data): void
    {
        $role = $data['account_role'] ?? AccountRole::Individual->value;
        if (! is_string($role) || $role === '') {
            $role = AccountRole::Individual->value;
        }

        session([
            self::SESSION_KEY => [
                'account_role' => $role,
                'organisation_type' => $data['organisation_type'] ?? null,
                'organisation_name' => $data['organisation_name'] ?? null,
                'expires_at' => now()->addMinutes(self::TTL_MINUTES)->getTimestamp(),
            ],
            self::ARMED_KEY => true,
        ]);
    }

    public static function pullArmed(): bool
    {
        return (bool) session()->pull(self::ARMED_KEY, false);
    }

    /**
     * @return array{account_role: mixed, organisation_type: mixed, organisation_name: mixed}|null
     */
    public static function get(): ?array
    {
        $intent = session(self::SESSION_KEY);
        if (! is_array($intent)) {
            return null;
        }

        $expiresAt = (int) ($intent['expires_at'] ?? 0);
        if ($expiresAt < now()->getTimestamp()) {
            self::forget();

            return null;
        }

        return [
            'account_role' => $intent['account_role'] ?? null,
            'organisation_type' => $intent['organisation_type'] ?? null,
            'organisation_name' => $intent['organisation_name'] ?? null,
        ];
    }

    public static function forget(): void
    {
        session()->forget([self::SESSION_KEY, self::ARMED_KEY]);
    }
}
