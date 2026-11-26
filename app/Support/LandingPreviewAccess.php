<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * Mutqin 2.0 marketing preview (routes under /preview). Not indexed; not public.
 */
final class LandingPreviewAccess
{
    public static function enabled(): bool
    {
        return (bool) config('mutqin.landing_preview_enabled', true);
    }

    /**
     * @return list<string>
     */
    public static function allowedEmails(): array
    {
        $configured = config('mutqin.landing_preview_emails', []);

        return is_array($configured) ? $configured : [];
    }

    public static function allowed(?User $user): bool
    {
        if (! $user instanceof User || ! $user->hasVerifiedEmail()) {
            return false;
        }

        $email = AdminEmails::normalize($user->email);

        return in_array($email, self::allowedEmails(), true);
    }

    public static function abortUnlessAllowed(?User $user): void
    {
        if (! self::allowed($user)) {
            abort(404);
        }
    }

    public static function allowedForRequest(Request $request): bool
    {
        if (! self::enabled()) {
            return false;
        }

        if (PreviewSandbox::publicAccessEnabled()) {
            return true;
        }

        if (self::allowed($request->user())) {
            return true;
        }

        $ownerId = PreviewSandbox::ownerUserId($request);
        if ($ownerId === null) {
            return false;
        }

        $owner = User::query()->find($ownerId);

        return self::allowed($owner);
    }

    public static function abortUnlessAllowedForRequest(Request $request): void
    {
        if (! self::allowedForRequest($request)) {
            abort(404);
        }
    }
}
