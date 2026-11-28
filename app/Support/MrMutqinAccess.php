<?php

namespace App\Support;

use App\Models\User;

/**
 * Mr. Mutqin beta access — builds on session voice rollout rules with a master flag.
 */
final class MrMutqinAccess
{
    public static function enabled(): bool
    {
        return filter_var(config('mutqin.mr_mutqin.enabled', false), FILTER_VALIDATE_BOOL);
    }

    public static function visible(?User $user): bool
    {
        if (! self::enabled() || ! $user instanceof User) {
            return false;
        }

        if (SessionVoiceAccess::visible($user)) {
            return true;
        }

        $betaEmails = config('mutqin.mr_mutqin.beta_emails', []);

        return in_array(AdminEmails::normalize((string) $user->email), $betaEmails, true);
    }

    public static function vocabularyLanguage(?User $user): string
    {
        $locale = $user?->locale ?? app()->getLocale();

        return str_starts_with(strtolower((string) $locale), 'ar') ? 'ar' : 'en';
    }
}