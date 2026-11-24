<?php

namespace App\Support;

use App\Enums\PlatformContext;
use App\Models\User;

/**
 * Single post-auth destination for login / guest redirects.
 * Preferred platform wins when the user still holds that role.
 * Otherwise verified teachers land on the teacher dashboard when enabled,
 * verified parents on the parent workspace, and everyone else on memorisation.
 * Unverified accounts go to the email verification notice when verification is enabled.
 * Get Pro from /pricing stores a plan and resumes Stripe checkout after auth.
 * Connection setup is optional via Connect — never forced after signup.
 */
final class AuthRedirect
{
    public static function routeName(?User $user, bool $justRegistered = false): string
    {
        // Email/password accounts must verify before practice when enabled;
        // Google users with a trusted provider-verified email already have email_verified_at set.
        if ($user !== null && ! $user->hasVerifiedEmail()) {
            return 'verification.notice';
        }

        if ($user !== null) {
            $preferred = $user->preferred_platform;
            if ($preferred instanceof PlatformContext
                && PlatformContextResolver::userCanUsePlatform($user, $preferred)) {
                return match ($preferred) {
                    PlatformContext::Teacher => 'teacher.dashboard',
                    PlatformContext::Parent => 'parent.dashboard',
                    PlatformContext::Learner => 'memorisation',
                };
            }
        }

        if ($user !== null && TeacherFeatures::enabled() && $user->isTeacher()) {
            return 'teacher.dashboard';
        }

        if ($user !== null && ParentFeatures::enabled() && $user->isParent()) {
            return 'parent.dashboard';
        }

        return 'memorisation';
    }

    public static function to(?User $user, bool $justRegistered = false): string
    {
        return self::url($user, $justRegistered, absolute: true);
    }

    /**
     * Path form used by laravel/ui redirectTo() / $redirectTo.
     */
    public static function path(?User $user, bool $justRegistered = false): string
    {
        return self::url($user, $justRegistered, absolute: false);
    }

    private static function url(?User $user, bool $justRegistered, bool $absolute): string
    {
        if ($user !== null && $user->hasVerifiedEmail()) {
            $plan = BillingIntent::peek();
            if ($plan !== null) {
                return route('pricing', [
                    'plan' => $plan,
                    'checkout' => 1,
                ], $absolute);
            }
        }

        return route(self::routeName($user, $justRegistered), absolute: $absolute);
    }
}
