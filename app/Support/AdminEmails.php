<?php

namespace App\Support;

use Illuminate\Support\Arr;

final class AdminEmails
{
    /**
     * Reserved admin mailbox addresses (bootstrap / deny-list only).
     * Privilege is granted via users.is_admin, not by matching these emails at runtime.
     *
     * @return list<string>
     */
    public static function reserved(): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($email): string => strtolower(trim((string) $email)),
            Arr::wrap(config('mutqin.admin_emails', []))
        ))));
    }

    public static function isReserved(?string $email): bool
    {
        if ($email === null || $email === '') {
            return false;
        }

        return in_array(strtolower(trim($email)), self::reserved(), true);
    }
}
