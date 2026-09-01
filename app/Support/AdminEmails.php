<?php

namespace App\Support;

use Illuminate\Support\Arr;

/**
 * MVP admin mailbox allowlist from MUTQIN_ADMIN_EMAILS.
 *
 * Used as:
 * - eligibility check together with users.is_admin + verified email (User::isAdmin)
 * - registration/profile deny-list so learners cannot squat admin mailboxes
 *
 * Never grant privilege from a request email alone.
 */
final class AdminEmails
{
    /**
     * @return list<string>
     */
    public static function allowlist(): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($email): string => strtolower(trim((string) $email)),
            Arr::wrap(config('mutqin.admin_emails', []))
        ))));
    }

    /**
     * @return list<string>
     */
    public static function reserved(): array
    {
        return self::allowlist();
    }

    public static function isAllowlisted(?string $email): bool
    {
        if ($email === null || trim($email) === '') {
            return false;
        }

        return in_array(strtolower(trim($email)), self::allowlist(), true);
    }

    public static function isReserved(?string $email): bool
    {
        return self::isAllowlisted($email);
    }

    /**
     * When the allowlist is empty, email match is not required (ops use is_admin only).
     * When configured, the normalized email must be an exact allowlist entry.
     */
    public static function matchesAllowlist(?string $email): bool
    {
        $list = self::allowlist();

        if ($list === []) {
            return true;
        }

        return self::isAllowlisted($email);
    }

    public static function normalize(?string $email): string
    {
        return strtolower(trim((string) $email));
    }
}
