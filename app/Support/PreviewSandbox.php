<?php

namespace App\Support;

use App\Models\PreviewSandboxSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Group J1 — isolated preview demo sandbox sessions (server-side).
 */
final class PreviewSandbox
{
    public const SESSION_ID_KEY = 'mutqin_preview_sandbox_id';

    public const OWNER_USER_ID_KEY = 'mutqin_landing_preview_owner_id';

    public static function enabled(): bool
    {
        if (! LandingPreviewAccess::enabled()) {
            return false;
        }

        return (bool) config('mutqin.preview_sandbox.enabled', true);
    }

    public static function publicAccessEnabled(): bool
    {
        return (bool) config('mutqin.preview_sandbox.public_access_enabled', false);
    }

    public static function ownerUserId(Request $request): ?int
    {
        $fromSession = $request->session()->get(self::OWNER_USER_ID_KEY);
        if (is_numeric($fromSession)) {
            return (int) $fromSession;
        }

        $user = $request->user();
        if ($user instanceof User && LandingPreviewAccess::allowed($user)) {
            return (int) $user->id;
        }

        return null;
    }

    public static function sessionId(Request $request): ?string
    {
        $id = $request->session()->get(self::SESSION_ID_KEY);

        return is_string($id) && $id !== '' ? $id : null;
    }

    public static function resolveSession(Request $request): ?PreviewSandboxSession
    {
        if (! self::enabled()) {
            return null;
        }

        $sessionId = self::sessionId($request);
        if ($sessionId === null) {
            $sessionId = self::sessionIdFromDemoPayload($request);
        }

        if ($sessionId === null) {
            return null;
        }

        $session = PreviewSandboxSession::query()->find($sessionId);
        if ($session === null || $session->isExpired()) {
            return null;
        }

        $ownerId = self::ownerUserId($request);
        if ($ownerId === null) {
            $ownerId = (int) $session->owner_user_id;
        }

        if ($ownerId < 1 || (int) $session->owner_user_id !== $ownerId) {
            return null;
        }

        if (
            self::sessionId($request) !== $session->id
            || (int) self::ownerUserId($request) !== $ownerId
        ) {
            $owner = User::query()->find($ownerId);
            if ($owner instanceof User) {
                self::bindHttpSession($request, $session, $owner);
            }
        }

        return $session;
    }

    /**
     * Drop synthetic demo login and optionally restore the preview allowlist owner.
     */
    public static function ejectSyntheticDemo(Request $request): ?User
    {
        $ownerId = self::ownerUserId($request);
        if ($ownerId === null) {
            $fromDemo = self::sessionIdFromDemoPayload($request);
            if ($fromDemo !== null) {
                $row = PreviewSandboxSession::query()->find($fromDemo);
                if ($row instanceof PreviewSandboxSession) {
                    $ownerId = (int) $row->owner_user_id;
                }
            }
        }

        Auth::logout();

        $request->session()->forget([
            LandingPreviewDemo::SESSION_KEY,
            LandingPreviewDemo::GUIDED_SESSION_KEY,
            LandingPreviewDemo::WALKTHROUGH_ID_SESSION_KEY,
        ]);
        self::clearHttpSession($request);
        PreviewSandboxEntitlement::clearSessionTier($request);

        if ($ownerId === null || $ownerId < 1) {
            return null;
        }

        $owner = User::query()->find($ownerId);
        if (! $owner instanceof User || ! LandingPreviewAccess::allowed($owner)) {
            return null;
        }

        Auth::login($owner, true);

        return $owner;
    }

    private static function sessionIdFromDemoPayload(Request $request): ?string
    {
        $demo = $request->session()->get(LandingPreviewDemo::SESSION_KEY);
        if (! is_array($demo)) {
            return null;
        }

        $id = $demo['sandbox_session_id'] ?? null;

        return is_string($id) && $id !== '' ? $id : null;
    }

    public static function bindHttpSession(Request $request, PreviewSandboxSession $session, User $owner): void
    {
        $request->session()->put(self::SESSION_ID_KEY, $session->id);
        $request->session()->put(self::OWNER_USER_ID_KEY, (int) $owner->id);
    }

    public static function clearHttpSession(Request $request): void
    {
        $request->session()->forget([self::SESSION_ID_KEY, self::OWNER_USER_ID_KEY]);
    }

    public static function previewHubAllowed(?User $user, Request $request): bool
    {
        if (self::publicAccessEnabled()) {
            return true;
        }

        if (LandingPreviewAccess::allowed($user)) {
            return true;
        }

        $ownerId = self::ownerUserId($request);
        if ($ownerId === null) {
            return false;
        }

        $owner = User::query()->find($ownerId);

        return LandingPreviewAccess::allowed($owner);
    }

    public static function suppressesSideEffects(Request $request): bool
    {
        if (! self::enabled()) {
            return false;
        }

        if (self::resolveSession($request) instanceof PreviewSandboxSession) {
            return true;
        }

        $user = $request->user();
        if ($user instanceof User && LandingPreviewDemo::isSyntheticDemoUser($user)) {
            return true;
        }

        return $request->session()->has(LandingPreviewDemo::SESSION_KEY);
    }

    public static function rateLimitKey(Request $request): string
    {
        $ownerId = self::ownerUserId($request);
        if ($ownerId !== null) {
            return 'preview-sandbox-owner:'.$ownerId;
        }

        return 'preview-sandbox-ip:'.$request->ip();
    }
}
