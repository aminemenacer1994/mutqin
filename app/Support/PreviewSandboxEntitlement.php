<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * Group J3 — session-only entitlement preview (never persists to the preview owner).
 */
final class PreviewSandboxEntitlement
{
    public const SESSION_TIER_KEY = 'mutqin_preview_sandbox_entitlement_tier';

    public const DEFAULT_TIER = 'free';

    /**
     * @return list<string>
     */
    public static function allowedTiers(): array
    {
        return ['free', 'premium', 'pro'];
    }

    public static function sessionTier(Request $request): ?string
    {
        $tier = $request->session()->get(self::SESSION_TIER_KEY);
        if (! is_string($tier)) {
            return null;
        }

        $tier = strtolower($tier);

        return in_array($tier, self::allowedTiers(), true) ? $tier : null;
    }

    public static function setSessionTier(Request $request, string $tier): void
    {
        $tier = strtolower($tier);
        if (! in_array($tier, self::allowedTiers(), true)) {
            abort(422, 'Invalid demonstration tier.');
        }

        if (! self::overlayApplies($request, $request->user())) {
            abort(403, 'Entitlement preview is not available outside a sandbox demo.');
        }

        $request->session()->put(self::SESSION_TIER_KEY, $tier);
    }

    public static function clearSessionTier(Request $request): void
    {
        $request->session()->forget(self::SESSION_TIER_KEY);
    }

    public static function overlayApplies(Request $request, ?User $user): bool
    {
        if (! PreviewSandbox::suppressesSideEffects($request)) {
            return false;
        }

        $demo = $request->session()->get(LandingPreviewDemo::SESSION_KEY);
        $persona = is_array($demo) ? (string) ($demo['persona'] ?? '') : '';

        if ($persona === 'memorisation_guest') {
            return true;
        }

        if ($user instanceof User && LandingPreviewDemo::isSyntheticDemoUser($user)) {
            return true;
        }

        return false;
    }

    public static function effectiveTier(Request $request, ?User $user): string
    {
        $overlay = self::sessionTier($request);
        if ($overlay !== null && self::overlayApplies($request, $user)) {
            return $overlay;
        }

        return $user instanceof User ? $user->effectiveSubscriptionTier() : self::DEFAULT_TIER;
    }

    public static function hasPremiumAccess(Request $request, User $user): bool
    {
        $forced = self::forcedPremiumAccess($request, $user);
        if ($forced !== null) {
            return $forced;
        }

        return $user->hasPremiumAccess();
    }

    public static function hasProAccess(Request $request, User $user): bool
    {
        $forced = self::forcedProAccess($request, $user);
        if ($forced !== null) {
            return $forced;
        }

        return $user->hasProAccess();
    }

    public static function hasPaidAccess(Request $request, User $user): bool
    {
        if (! self::overlayApplies($request, $user)) {
            return $user->hasPaidAccess();
        }

        $tier = self::effectiveTier($request, $user);

        return in_array($tier, ['premium', 'pro'], true);
    }

    private static function forcedPremiumAccess(Request $request, User $user): ?bool
    {
        if (! self::overlayApplies($request, $user) || self::sessionTier($request) === null) {
            return null;
        }

        $tier = self::effectiveTier($request, $user);

        return in_array($tier, ['premium', 'pro'], true);
    }

    private static function forcedProAccess(Request $request, User $user): ?bool
    {
        if (! self::overlayApplies($request, $user) || self::sessionTier($request) === null) {
            return null;
        }

        return self::effectiveTier($request, $user) === 'pro';
    }
}
