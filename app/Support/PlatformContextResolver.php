<?php

namespace App\Support;

use App\Enums\PlatformContext;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Session-backed active platform for users with multiple roles.
 */
final class PlatformContextResolver
{
    public const SESSION_KEY = 'mutqin_active_platform';

    public static function current(Request $request): PlatformContext
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return PlatformContext::Learner;
        }

        $stored = $request->session()->get(self::SESSION_KEY);
        if (is_string($stored)) {
            $context = PlatformContext::tryFrom($stored);
            if ($context !== null && self::userCanUsePlatform($user, $context)) {
                return $context;
            }
        }

        if (TeacherFeatures::enabled() && $user->isTeacher()) {
            return PlatformContext::Teacher;
        }

        if (ParentFeatures::enabled() && $user->isParent()) {
            return PlatformContext::Parent;
        }

        return PlatformContext::Learner;
    }

    public static function set(Request $request, PlatformContext $context): void
    {
        $user = $request->user();
        abort_unless($user instanceof User && self::userCanUsePlatform($user, $context), 403);

        $request->session()->put(self::SESSION_KEY, $context->value);

        if ($user->preferred_platform !== $context) {
            $user->forceFill(['preferred_platform' => $context->value])->save();
        }
    }


    /**
     * @return list<PlatformContext>
     */
    public static function availableFor(User $user): array
    {
        $platforms = [PlatformContext::Learner];

        if (TeacherFeatures::enabled() && $user->isTeacher()) {
            $platforms[] = PlatformContext::Teacher;
        }

        if (ParentFeatures::enabled() && $user->isParent()) {
            $platforms[] = PlatformContext::Parent;
        }

        return $platforms;
    }

    public static function userCanUsePlatform(User $user, PlatformContext $context): bool
    {
        return match ($context) {
            PlatformContext::Learner => true,
            PlatformContext::Teacher => TeacherFeatures::enabled() && $user->isTeacher(),
            PlatformContext::Parent => ParentFeatures::enabled() && $user->isParent(),
        };
    }

    /**
     * @return array<string, string|null>
     */
    public static function routeUrls(User $user): array
    {
        return [
            PlatformContext::Learner->value => route('memorisation'),
            PlatformContext::Teacher->value => TeacherFeatures::enabled() && $user->isTeacher()
                ? route('teacher.dashboard')
                : null,
            PlatformContext::Parent->value => ParentFeatures::enabled() && $user->isParent()
                ? route('parent.dashboard')
                : null,
        ];
    }
}
